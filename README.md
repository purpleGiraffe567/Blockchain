# Remita

Remita is a cross-border bill payment demo. A family member in the home country uploads utility bills, and an overseas family member sees those bills and pays them from a Stellar wallet using USDC on the Stellar Testnet.

## Roles

- **Family Member (Recipient):** uploads bills (biller, account number, amount, currency, category, due date), tracks which are Pending or Paid, and generates nothing sensitive. Enters a one-time code from an overseas family member to link accounts.
- **Overseas Worker (Sender):** generates a one-time connection code, shares it with a family member, and sees the bills of every linked family member. Pays a bill with "Pay via Stellar".

Use "Switch" in the header to move between roles. Identity is tied to the browser, so each browser keeps its own profile.

## Connecting accounts

1. The overseas worker opens the Connected Family panel and selects Generate Connection Code.
2. The family member opens the Linked Senders panel and enters the six-digit code, then selects Link.
3. Codes expire after 10 minutes and can only be used once. Several family members can link to one sender, and either side can remove a connection.

## Paying a bill

Senders select Pay via Stellar on a pending bill. The app creates a throwaway Testnet wallet, funds it through Friendbot, and submits a path payment. When the payment succeeds, the bill is marked Paid and links to the transaction on the Stellar Testnet explorer.

## Data and services

- **Supabase** stores profiles, bills, connections, and one-time codes. The connection is already provisioned, and no keys need to be entered by hand.
- **Stellar Testnet** (Horizon) requires no API key. Test accounts are funded automatically.
- The payout issuers and anchor account are placeholder Testnet keys, not a real anchor integration. Treat the currency routing as a demonstration.

## Limitations

- Identity is device-based. There is no sign-in, so anyone with the app can act as either role.
- Six-digit codes have no attempt limit, so they are not protected against guessing over many tries.
- This is a Testnet demo and must not be used with real funds.
