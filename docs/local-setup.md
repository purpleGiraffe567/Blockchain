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

Create a `.env.local` file in the project root (or copy `.env.example`) and add your configuration:

```ini
# Stellar Smart Contract Configuration
NEXT_PUBLIC_CONTRACT_ID=your_stellar_contract_id_here
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_publishable_key_here
```


These are client-side configuration values used by this demo. Never put a Supabase service-role key or other private secret in a `NEXT_PUBLIC_` variable.

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
