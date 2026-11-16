# 🪟 Windows Setup

Use this guide to install the tools required to run Remita on Windows.

## 1. Install Node.js

Install **Node.js 18 or higher** from the [official Node.js website](https://nodejs.org/). Follow the installer prompts, then open a new PowerShell window.

Verify the installation:

```powershell
node --version
npm --version
```

## 2. Install Git

Install Git for Windows from [git-scm.com](https://git-scm.com/download/win), then verify:

```powershell
git --version
```

## 3. Install Rust

Follow the instructions at [rustup.rs](https://rustup.rs/) to install Rust for Windows. After installation, open a new PowerShell window and verify:

```powershell
rustc --version
cargo --version
```

Add the WebAssembly target used by the contract:

```powershell
rustup target add wasm32v1-none
```

## 4. Install Stellar CLI

Install Stellar CLI using Windows Package Manager (Winget):

```powershell
winget install --id Stellar.StellarCLI
```

Verify:

```powershell
stellar --version
```

## 5. Clone and Run Remita

Continue with the shared [Local Setup Guide](local-setup.md) to clone the repository, configure `.env.local`, install npm dependencies, and start the development server.

## ⛓️ Building or Deploying the Contract

When you are ready to build or deploy the Soroban contract, follow the [Smart Contract Guide](smart-contract.md). It includes PowerShell command examples.

[← Back to README](../README.md)
