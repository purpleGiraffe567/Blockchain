# 🍎 macOS Setup

Use this guide to install the tools required to run Remita on macOS.

## 1. Install Homebrew

If Homebrew is not already installed, follow the instructions on the [official Homebrew website](https://brew.sh/).

Verify:

```bash
brew --version
```

## 2. Install Node.js

Install **Node.js 18 or higher** with Homebrew:

```bash
brew install node
```

Verify:

```bash
node --version
npm --version
```

## 3. Install Git

Git is commonly available through the Xcode Command Line Tools. If needed, run:

```bash
xcode-select --install
```

Verify:

```bash
git --version
```

## 4. Install Rust

Install Rust using the instructions at [rustup.rs](https://rustup.rs/). Then restart your terminal or load the Cargo environment:

```bash
source "$HOME/.cargo/env"
```

Verify:

```bash
rustc --version
cargo --version
```

Add the WebAssembly target used by the contract:

```bash
rustup target add wasm32v1-none
```

## 5. Install Stellar CLI

Install Stellar CLI using Homebrew:

```bash
brew install stellar-cli
```

Verify:

```bash
stellar --version
```

The official [Stellar CLI repository](https://github.com/stellar/stellar-cli) also documents other installation methods.

## 6. Clone and Run Remita

Continue with the shared [Local Setup Guide](local-setup.md) to clone the repository, configure `.env.local`, install npm dependencies, and start the development server.

## ⛓️ Building or Deploying the Contract

When you are ready to build or deploy the Soroban contract, follow the [Smart Contract Guide](smart-contract.md). It includes macOS Terminal command examples.

[← Back to README](../README.md)
