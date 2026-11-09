/*
 * lib/stellar.js
 *
 * Backend helper that executes a PathPaymentStrictReceive transaction on the
 * Stellar Testnet so that an overseas worker can pay a family bill in USDC
 * while the network routes the equivalent local-currency funds to a payout
 * anchor.
 *
 * Horizon (Testnet): https://horizon-testnet.stellar.org
 *
 * Design:
 *  - Sender pays in USDC (Testnet USDC issuer).
 *  - Destination is the payout anchor's receiving account, which accepts a
 *    local-currency asset (e.g. PHP) issued by the anchor.
 *  - PathPaymentStrictReceive guarantees the destination receives an exact
 *    destAmount of the local asset; the sender's sendMax caps their USDC spend.
 *  - If no liquid path exists between USDC and the local asset, we fall back to
 *    a direct USDC transfer to the anchor and surface that honestly.
 *
 * This module is intended to be called from a Next.js route handler
 * (app/api/pay/route.ts) — it never runs in the browser.
 */

const {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  BASE_FEE,
} = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new Horizon.Server(HORIZON_URL);

// Testnet USDC issuer. Used as the SENDER asset. (Demo address — valid format.)
const USDC_ISSUER =
  process.env.STELLAR_USDC_ISSUER ||
  'GB2BDK5RK7TQ4VDMXQR6LW4TKJK6QFXWUVAXEASU6MJI23W6E7IU4MI4';

// Payout anchor: issues the local currency (e.g. PHP) and receives the funds.
const LOCAL_ASSET_CODE = process.env.STELLAR_LOCAL_ASSET_CODE || 'PHP';
const LOCAL_ASSET_ISSUER =
  process.env.STELLAR_LOCAL_ASSET_ISSUER ||
  'GC72JC4GQBXCAT24C4DMSNNVW7Z4GRZS2NLOTPFNZVLUT6L3AFELTYFB';

// The payout anchor's receiving account.
const PAYOUT_DESTINATION =
  process.env.STELLAR_PAYOUT_DESTINATION ||
  'GCUEJA67MHQXSLUIRMNVXEJROZNIYXQKSO5CR5KSBSR5QMPICXNZLEFH';

// Assets are constructed lazily so module load never throws on an invalid key.
let _USDC_ASSET = null;
let _LOCAL_ASSET = null;
function getUsdcAsset() {
  if (!_USDC_ASSET) _USDC_ASSET = new Asset('USDC', USDC_ISSUER);
  return _USDC_ASSET;
}
function getLocalAsset() {
  if (!_LOCAL_ASSET) _LOCAL_ASSET = new Asset(LOCAL_ASSET_CODE, LOCAL_ASSET_ISSUER);
  return _LOCAL_ASSET;
}

// Rough FX rate: local currency units per 1 USDC. Used to compute destAmount
// and sendMax. In production this comes from a price oracle / the Stellar DEX.
const DEFAULT_FX_RATE = 56.0; // ~1 USDC = 56 PHP

/**
 * Execute a path payment from the sender's USDC to the payout anchor's local
 * currency. If a sender secret is not provided, a fresh testnet account is
 * generated and funded via Friendbot so the demo always works end-to-end.
 *
 * @param {Object} params
 * @param {number} params.amountLocal
 * @param {string} [params.currency]
 * @param {string} [params.senderSecret]
 * @param {number} [params.fxRate]
 * @returns {Promise<Object>} PayResult
 */
async function payBillOnStellar(params) {
  const fxRate = params.fxRate ?? DEFAULT_FX_RATE;
  const destAmountRaw = params.amountLocal;
  // The destination must receive exactly the bill's local amount.
  const destAmount = trimNum(destAmountRaw.toFixed(7));
  // Cap the sender's USDC spend at the equivalent USDC + 1% slippage buffer.
  const usdcEquivalent = destAmountRaw / fxRate;
  const sendMax = trimNum((usdcEquivalent * 1.01).toFixed(7));

  // Resolve or create the sender account.
  let senderKeypair;
  if (params.senderSecret) {
    senderKeypair = Keypair.fromSecret(params.senderSecret);
  } else {
    senderKeypair = Keypair.random();
    await fundWithFriendbot(senderKeypair.publicKey());
  }

  const sourceAccount = await server.loadAccount(senderKeypair.publicKey());

  const usdcAsset = getUsdcAsset();
  const localAsset = getLocalAsset();

  // Try to find a payment path USDC -> LOCAL through the DEX.
  let path = [];
  let pathFound = false;
  try {
    const pathsResp = await server.strictReceivePaths(
      [usdcAsset],
      localAsset,
      destAmount
    );
    // @ts-expect-error — SDK typing for call() is loose
    const records = (pathsResp.records || []) || [];
    if (records.length > 0) {
      path = records[0].path.map((p) =>
        p.asset_type === 'native'
          ? Asset.native()
          : new Asset(p.asset_code, p.asset_issuer)
      );
      pathFound = true;
    }
  } catch {
    // Path lookup failed (asset not present on testnet, etc.) — fall back below.
    pathFound = false;
  }

  const baseBuilder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
    timeout: 180,
  });

  let operation;
  let direct = false;
  if (pathFound) {
    operation = Operation.pathPaymentStrictReceive({
      sendAsset: usdcAsset,
      sendMax,
      destination: PAYOUT_DESTINATION,
      destAsset: localAsset,
      destAmount,
      path,
    });
  } else {
    // Fallback: direct USDC transfer to the anchor (no DEX path available).
    direct = true;
    operation = Operation.payment({
      destination: PAYOUT_DESTINATION,
      asset: usdcAsset,
      amount: sendMax,
    });
  }

  const transaction = baseBuilder.addOperation(operation).build();
  transaction.sign(senderKeypair);

  const txResult = await server.submitTransaction(transaction);
  const txHash = (txResult && (txResult.hash || txResult.id)) || null;

  if (!txHash) {
    return {
      success: false,
      txHash: null,
      senderKeypair,
      destination: PAYOUT_DESTINATION,
      sendAssetCode: 'USDC',
      destAssetCode: direct ? 'USDC' : LOCAL_ASSET_CODE,
      sendMax,
      destAmount,
      pathLength: path.length,
      direct,
      message: 'Transaction was submitted but no hash was returned.',
    };
  }

  return {
    success: true,
    txHash,
    senderKeypair,
    destination: PAYOUT_DESTINATION,
    sendAssetCode: 'USDC',
    destAssetCode: direct ? 'USDC' : LOCAL_ASSET_CODE,
    sendMax,
    destAmount,
    pathLength: path.length,
    direct,
    message: direct
      ? `Direct USDC transfer of ${sendMax} USDC to payout anchor (no DEX path to ${LOCAL_ASSET_CODE} on testnet).`
      : `Path payment delivered exactly ${destAmount} ${LOCAL_ASSET_CODE} to the payout anchor via ${path.length}-hop path.`,
  };
}

async function fundWithFriendbot(publicKey) {
  try {
    await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
    );
  } catch {
    // Non-fatal: account may already be funded, or funding will be retried.
  }
}

function trimNum(s) {
  return s.replace(/\.?0+$/, '');
}

/** Build a friendly explorer link for a tx hash. */
function explorerTxUrl(txHash) {
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}

module.exports = {
  HORIZON_URL,
  server,
  USDC_ISSUER,
  LOCAL_ASSET_CODE,
  LOCAL_ASSET_ISSUER,
  PAYOUT_DESTINATION,
  payBillOnStellar,
  explorerTxUrl,
};
