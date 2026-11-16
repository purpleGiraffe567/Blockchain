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

## Welcome

Remita is a cross-border bill payment demo. A family member in their home country uploads utility bills, and an overseas family member views those bills and pays them from a Stellar wallet using USDC on the Stellar Testnet.

> **⚠️ Demo only:** Remita runs on Stellar Testnet and must not be used with real funds.

## Open the App

Use the hosted deployment—no local installation or setup is needed:

**[🚀 Open Remita](https://blockchain-lilac-nine.vercel.app/)**

## Documentation

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🚀 Use the App</h3>
      Learn how the two roles work, connect family accounts, and pay a bill.
      <br><br>
      <a href="docs/using-the-app.md">Open the app guide →</a>
    </td>
    <td width="50%" valign="top">
      <h3>⛓️ Smart Contract Development</h3>
      Build, deploy, and test the Soroban contract on Stellar Testnet.
      <br><br>
      <a href="docs/smart-contract.md">Open the smart contract guide →</a>
    </td>
  </tr>
</table>

## 🔗 Live Prototype & Blockchain Details

| Resource | Details |
|---|---|
| **Remita app** | [Open the Vercel deployment](https://blockchain-lilac-nine.vercel.app/) |
| **Stellar Testnet Contract ID** | `CAXHP6BEZLR7TMAOLDLR2CJ3JQQO7HXINQZHIY4WBQHLV6IFHD3LPNO6` |
| **Stellar Lab Explorer** | [View contract on Stellar Lab](https://lab.stellar.org/r/testnet/contract/CAXHP6BEZLR7TMAOLDLR2CJ3JQQO7HXINQZHIY4WBQHLV6IFHD3LPNO6) |
| **Deployment transaction** | [View transaction on Stellar.Expert](https://stellar.expert/explorer/testnet/tx/97c0f59b0c5129f7900f6c1d96269af11ac6158064847a569c7b634ddb3b9c07) |
| **1-minute demo** | *Add YouTube link here* |

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Frontend** | Next.js (App Router), React, Tailwind CSS |
| **Smart contracts** | Rust, Soroban SDK, WebAssembly (`wasm32v1-none`) |
| **Blockchain** | Stellar Testnet & Horizon API |
| **Database** | Supabase |
| **Wallet integration** | `@creit.tech/stellar-wallets-kit`, `@stellar/stellar-sdk` |

## ⚠️ Important Limitations

- Identity is browser-based, with separate sender and recipient profiles remembered on that browser. There is no account sign-in, so profiles do not sync across browsers or devices.
- Connection codes expire after one minute, with a limit of five verification attempts per minute.
- Testnet payments require provisioned sender, issuer, and payout accounts with the required trustlines and balances. This is not a real anchor integration; currency routing is for demonstration purposes.
- This is a Testnet demo. **Do not use it with real funds.**

---

<div align="center">

**Built for demonstration on Stellar Testnet.**

</div>
