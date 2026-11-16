# Remita

Remita is a cross-border bill payment demo. A family member in the home country uploads utility bills, and an overseas family member sees those bills and pays them from a Stellar wallet using USDC on the Stellar Testnet.

## Open the App

Open the [Remita Vercel deployment](https://blockchain-lilac-nine.vercel.app/) on your phone, tablet, or computer. No cloning, installation, or local environment setup is needed.

The app remembers separate sender and recipient profiles and the selected role in each browser. There is no account sign-in, so profiles do not sync between browsers or devices.

## Roles

- **Family Member (Recipient):** uploads bills (biller, account number, amount, currency, category, due date), tracks which are Pending or Paid, and generates nothing sensitive. Enters a one-time code from an overseas family member to link accounts.
- **Overseas Worker (Sender):** generates a one-time connection code, shares it with a family member, and sees the bills of every linked family member. Pays a bill with "Pay via Stellar".

Use "Switch" in the header to move between roles. Each browser keeps separate sender and recipient profiles, and remembers the selected role across visits. This is browser-based identity, not an account login, so profiles do not sync across browsers or devices.

## Connecting accounts

1. The overseas worker opens the Connected Family panel and selects Generate Connection Code.
2. The family member opens the Linked Senders panel and enters the six-digit code, then selects Link.
3. Codes expire after one minute and can only be used once. Recipients are limited to five verification attempts per minute. Several family members can link to one sender, and either side can remove a connection.

## Paying a bill

Senders select Pay via Stellar on a pending bill and confirm the payment. When the payment succeeds, the bill is marked Paid and links to the transaction on the Stellar Testnet explorer. If the sender account needs USDC, the app provides its public address and a link to the [Circle Testnet Faucet](https://faucet.circle.com/); faucet funding requires user verification.

## Data and services

- **Vercel** hosts the app, so it can be opened from supported devices without local setup.
- **Supabase** stores browser profiles, bills, connections, and one-time codes.
- **Stellar Testnet** handles demonstration payments. No real funds are moved; currency routing is not a real anchor integration.

## Limitations

- Identity is browser-based. There is no sign-in, so anyone using the same browser can access its sender and recipient profiles.
- Connection codes expire after one minute and verification is limited to five attempts per minute.
- This is a Testnet demo and must not be used with real funds.




