# ⛓️ Smart Contract Build & Deployment

This guide explains how to build, deploy, and test the Soroban smart contract on Stellar Testnet.

> **Important:** These commands create and fund a Testnet identity and deploy a contract. They are not production deployment instructions.

## 📍 Navigate to the Contracts Directory

From the repository root:

```bash
cd contracts
```

## 1. Generate and Fund a Testnet Identity

```bash
stellar keys generate alice --network testnet --fund
```

This creates a local identity named `alice` and funds it on Stellar Testnet.

## 2. Build the Rust Contract

```bash
stellar contract build
```

The project uses the `wasm32v1-none` WebAssembly target.

## 3. Deploy the Contract

Choose the command format for your terminal.

### 🪟 Windows PowerShell

```powershell
stellar contract deploy `
  --wasm target/wasm32v1-none/release/hello_world.wasm `
  --source-account alice `
  --network testnet `
  --alias hello_world
```

### 🍎 macOS Terminal

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/hello_world.wasm \
  --source-account alice \
  --network testnet \
  --alias hello_world
```

## 4. Test the Contract Invocation

### 🪟 Windows PowerShell

```powershell
stellar contract invoke `
  --id hello_world `
  --source-account alice `
  --network testnet `
  -- hello --to world
```

### 🍎 macOS Terminal

```bash
stellar contract invoke \
  --id hello_world \
  --source-account alice \
  --network testnet \
  -- hello --to world
```

## 🔎 Existing Testnet Deployment

The project README also lists an existing Testnet deployment:

- **Contract ID:** `CAXHP6BEZLR7TMAOLDLR2CJ3JQQO7HXINQZHIY4WBQHLV6IFHD3LPNO6`
- **[View contract on Stellar Lab](https://lab.stellar.org/r/testnet/contract/CAXHP6BEZLR7TMAOLDLR2CJ3JQQO7HXINQZHIY4WBQHLV6IFHD3LPNO6)**
- **[View deployment transaction on Stellar.Expert](https://stellar.expert/explorer/testnet/tx/97c0f59b0c5129f7900f6c1d96269af11ac6158064847a569c7b634ddb3b9c07)**

[← Back to README](../README.md)
