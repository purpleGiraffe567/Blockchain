<div align="center">

# 🌍 Remita

### Cross-border bill payments, powered by Stellar

A demo that helps families pay utility bills across borders using a Stellar wallet and USDC on the Stellar Testnet.

<p>
  <a href="https://lab.stellar.org/r/testnet/contract/CAXHP6BEZLR7TMAOLDLR2CJ3JQQO7HXINQZHIY4WBQHLV6IFHD3LPNO6"><strong>🔗 View Stellar Contract</strong></a>
  &nbsp; · &nbsp;
  <a href="https://stellar.expert/explorer/testnet/tx/97c0f59b0c5129f7900f6c1d96269af11ac6158064847a569c7b634ddb3b9c07"><strong>🧾 View Deployment Transaction</strong></a>
</p>

</div>

---

## 👋 Welcome

Remita is a cross-border bill payment demo. A family member in their home country uploads utility bills, and an overseas family member views those bills and pays them from a Stellar wallet using USDC on the Stellar Testnet.

> **⚠️ Demo only:** Remita runs on Stellar Testnet and must not be used with real funds.

## 🧭 Documentation

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🚀 Use the App</h3>
      Learn how the two roles work, connect family accounts, and pay a bill.
      <br><br>
      <a href="docs/using-the-app.md">Open the app guide →</a>
    </td>
    <td width="50%" valign="top">
      <h3>💻 Local Setup</h3>
      Configure your environment, install dependencies, and run Remita locally.
      <br><br>
      <a href="docs/local-setup.md">Open the local setup guide →</a>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🪟 Windows</h3>
      Windows-specific prerequisites and installation commands.
      <br><br>
      <a href="docs/windows-setup.md">Open Windows setup →</a>
    </td>
    <td width="50%" valign="top">
      <h3>🍎 macOS</h3>
      macOS-specific prerequisites and installation commands.
      <br><br>
      <a href="docs/macos-setup.md">Open macOS setup →</a>
    </td>
  </tr>
  <tr>
    <td colspan="2" valign="top">
      <h3>⛓️ Smart Contract Build & Deployment</h3>
      Build, deploy, and test the Soroban contract on Stellar Testnet.
      <br><br>
      <a href="docs/smart-contract.md">Open the smart contract guide →</a>
    </td>
  </tr>
</table>

## 🔗 Live Prototype & Blockchain Details

| Resource | Details |
|---|---|
| **Live application** | *Add your deployed application URL here* |
| **Stellar Testnet Contract ID** | `CAXHP6BEZLR7TMAOLDLR2CJ3JQQO7HXINQZHIY4WBQHLV6IFHD3LPNO6` |
| **Stellar Lab Explorer** | [View contract on Stellar Lab](https://lab.stellar.org/r/testnet/contract/CAXHP6BEZLR7TMAOLDLR2CJ3JQQO7HXINQZHIY4WBQHLV6IFHD3LPNO6) |
| **Deployment transaction** | [View transaction on Stellar.Expert](https://stellar.expert/explorer/testnet/tx/97c0f59b0c5129f7900f6c1d96269af11ac6158064847a569c7b634ddb3b9c07) |
| **1-minute demo** | *Add your Loom or YouTube link here* |

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Frontend** | Next.js (App Router), React, Tailwind CSS |
| **Smart contracts** | Rust, Soroban SDK, WebAssembly (`wasm32v1-none`) |
| **Blockchain** | Stellar Testnet & Horizon API |
| **Database & authentication** | Supabase |
| **Wallet integration** | `@creit.tech/stellar-wallets-kit`, `@stellar/stellar-sdk` |

## ⚠️ Important Limitations

- Identity is device-based. There is no sign-in, so anyone with access to the app can act as either role.
- Six-digit connection codes have no attempt limit, so they are not protected against repeated guessing attempts.
- The payout issuers and anchor account are placeholder Testnet keys, not a real anchor integration. Currency routing is for demonstration purposes.
- This is a Testnet demo. **Do not use it with real funds.**

---

<div align="center">

**Built for demonstration on Stellar Testnet.**

</div>
