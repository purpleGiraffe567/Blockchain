# 💻 Local Setup

This guide covers the steps shared by Windows and macOS users. For operating-system-specific installation instructions, start with the relevant guide:

- [🪟 Windows setup](windows-setup.md)
- [🍎 macOS setup](macos-setup.md)

## 📦 Prerequisites

Before running Remita locally, install:

1. **Node.js** — version 18 or higher.
2. **Git** — to clone the repository.
3. **Rust and the WebAssembly target** — required for smart-contract development.
4. **Stellar CLI** — required only if you plan to build, deploy, or invoke the Soroban contract.

> You do not need to rebuild or redeploy the smart contract just to run the Next.js app locally.

## 1. Clone the Repository

```bash
git clone https://github.com/purpleGiraffe567/Blockchain.git
cd Blockchain
```

## 2. Configure Environment Variables

Create a `.env.local` file in the project root and add:

```ini
# Stellar Smart Contract Configuration
NEXT_PUBLIC_CONTRACT_ID=CAXHP6BEZLR7TMAOLDLR2CJ3JQQO7HXINQZHIY4WBQHLV6IFHD3LPNO6
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Server-only Stellar Testnet payment configuration
STELLAR_SENDER_SECRET=<funded-testnet-sender-secret>
STELLAR_USDC_ISSUER=<testnet-usdc-issuer-public-key>
STELLAR_LOCAL_ASSET_CODE=PHP
STELLAR_LOCAL_ASSET_ISSUER=<testnet-local-asset-issuer-public-key>
STELLAR_PAYOUT_DESTINATION=<testnet-payout-account-public-key>

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://uxnvilrmheejgpvajdhi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_AKpEw9Rpdmo0vHbHtcKzVQ_t5Fe7Kj6
```

The sender account must have a USDC trustline, enough USDC for the payment, and XLM for fees. The payout account must exist on Testnet and accept the local asset, or USDC if no path is available. The issuer accounts must also exist on Testnet. Keep `STELLAR_SENDER_SECRET` server-side; never put it, a Supabase service-role key, or any other private secret in a `NEXT_PUBLIC_` variable. Restart the server after changing these values.

## 3. Install Dependencies

From the project root, run:

```bash
npm install
```

## 4. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## ⛓️ Smart Contract Development

If you also want to build or deploy the Soroban contract, follow the [Smart Contract Build & Deployment Guide](smart-contract.md).

[← Back to README](../README.md)
