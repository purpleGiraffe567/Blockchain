import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Remita — Cross-Border Bill Payment on Stellar',
  description:
    'Pay family utility bills directly with stablecoins on the Stellar network. No middlemen, no wire fees, just settled bills.',
  openGraph: {
    title: 'Remita — Cross-Border Bill Payment on Stellar',
    description:
      'Pay family utility bills directly with stablecoins on the Stellar network.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-serif bg-white text-black antialiased">
        {children}
      </body>
    </html>
  );
}
