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

// These public keys and the sender secret must be provisioned on Stellar Testnet.
const USDC_ISSUER = process.env.STELLAR_USDC_ISSUER;

const LOCAL_ASSET_CODE = process.env.STELLAR_LOCAL_ASSET_CODE || 'PHP';
const LOCAL_ASSET_ISSUER = process.env.STELLAR_LOCAL_ASSET_ISSUER;

const PAYOUT_DESTINATION = process.env.STELLAR_PAYOUT_DESTINATION;

function requiredServerEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing server-side Stellar configuration: ${name}.`);
  }
  return value;
}

async function loadTestnetAccount(publicKey, label) {
  try {
    return await server.loadAccount(publicKey);
  } catch (err) {
    const status = err?.response?.status || err?.status;
    if (status === 404) {
      throw new Error(`${label} ${publicKey} is not funded on Stellar Testnet.`);
    }
    throw err;
  }
}

function findAssetBalance(account, assetCode, issuer) {
  return account.balances.find(
    (balance) =>
      balance.asset_code === assetCode && balance.asset_issuer === issuer
  );
}

// Rough FX rate: local currency units per 1 USDC. Used to compute destAmount
// and sendMax. In production this comes from a price oracle / the Stellar DEX.
const DEFAULT_FX_RATE = 56.0; // ~1 USDC = 56 PHP

/**
 * Execute a path payment from the configured sender's USDC to the payout
 * anchor's local currency on Stellar Testnet.
 *
 * @param {Object} params
 * @param {number} params.amountLocal
 * @param {string} [params.currency]
 * @param {number} [params.fxRate]
 * @returns {Promise<Object>} PayResult
 */
async function payBillOnStellar(params) {
  const senderSecret = requiredServerEnv('STELLAR_SENDER_SECRET');
  const usdcIssuer = requiredServerEnv('STELLAR_USDC_ISSUER');
  const localAssetIssuer = requiredServerEnv('STELLAR_LOCAL_ASSET_ISSUER');
  const payoutDestination = requiredServerEnv('STELLAR_PAYOUT_DESTINATION');
  const fxRate = params.fxRate ?? DEFAULT_FX_RATE;
  const destAmountRaw = params.amountLocal;
  // The destination must receive exactly the bill's local amount.
  const destAmount = trimNum(destAmountRaw.toFixed(7));
  // Cap the sender's USDC spend at the equivalent USDC + 1% slippage buffer.
  const usdcEquivalent = destAmountRaw / fxRate;
  const sendMax = trimNum((usdcEquivalent * 1.01).toFixed(7));

  const senderKeypair = Keypair.fromSecret(senderSecret);
  const usdcAsset = new Asset('USDC', usdcIssuer);
  const localAsset = new Asset(LOCAL_ASSET_CODE, localAssetIssuer);

  await Promise.all([
    loadTestnetAccount(usdcIssuer, 'USDC issuer'),
    loadTestnetAccount(localAssetIssuer, 'Local asset issuer'),
  ]);
  const [sourceAccount, payoutAccount] = await Promise.all([
    loadTestnetAccount(senderKeypair.publicKey(), 'Sender account'),
    loadTestnetAccount(payoutDestination, 'Payout destination'),
  ]);

  const sourceUsdcBalance = findAssetBalance(
    sourceAccount,
    'USDC',
    usdcIssuer
  );
  if (!sourceUsdcBalance) {
    throw new Error(
      'The configured sender account needs a USDC trustline to the configured Testnet issuer.'
    );
  }
  if (Number(sourceUsdcBalance.balance) < Number(sendMax)) {
    throw new Error(
      `The configured sender account needs at least ${sendMax} USDC on Stellar Testnet.`
    );
  }

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

  const destinationBalance = pathFound
    ? findAssetBalance(payoutAccount, LOCAL_ASSET_CODE, localAssetIssuer)
    : findAssetBalance(payoutAccount, 'USDC', usdcIssuer);
  if (!destinationBalance) {
    const expectedAsset = pathFound
      ? `${LOCAL_ASSET_CODE} from the configured local issuer`
      : `USDC from the configured issuer`;
    throw new Error(
      `The payout destination needs a trustline to ${expectedAsset}.`
    );
  }

  const requiredDestinationAmount = Number(pathFound ? destAmount : sendMax);
  const availableTrustlineLimit =
    Number(destinationBalance.limit) - Number(destinationBalance.balance);
  if (availableTrustlineLimit < requiredDestinationAmount) {
    throw new Error('The payout destination trustline limit is too low for this bill.');
  }

  const baseBuilder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  });

  let operation;
  let direct = false;
  if (pathFound) {
    operation = Operation.pathPaymentStrictReceive({
      sendAsset: usdcAsset,
      sendMax,
      destination: payoutDestination,
      destAsset: localAsset,
      destAmount,
      path,
    });
  } else {
    // Fallback: direct USDC transfer to the anchor (no DEX path available).
    direct = true;
    operation = Operation.payment({
      destination: payoutDestination,
      asset: usdcAsset,
      amount: sendMax,
    });
  }

  const transaction = baseBuilder
    .addOperation(operation)
    .setTimeout(180)
    .build();
  transaction.sign(senderKeypair);

  const txResult = await server.submitTransaction(transaction);
  const txHash = (txResult && (txResult.hash || txResult.id)) || null;

  if (!txHash) {
    return {
      success: false,
      txHash: null,
      senderKeypair,
      destination: payoutDestination,
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
    destination: payoutDestination,
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
