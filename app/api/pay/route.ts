import { NextRequest, NextResponse } from 'next/server';
// stellar.js is a CommonJS module (per the project spec); type it loosely here.
import { payBillOnStellar } from '@/lib/stellar';

type PayResult = {
  success: boolean;
  txHash: string | null;
  senderKeypair: { publicKey: () => string };
  destination: string;
  sendAssetCode: string;
  destAssetCode: string;
  sendMax: string;
  destAmount: string;
  pathLength: number;
  direct: boolean;
  message: string;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Mock exchange rates: local currency -> USDC. In production a price oracle
// or the Stellar DEX order books would supply this.
const FX_RATES: Record<string, number> = {
  PHP: 56.0,
  MXN: 17.5,
  INR: 83.0,
  VND: 24500.0,
  NGN: 1500.0,
  KES: 129.0,
  USD: 1.0,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { billId, amountLocal, currency, senderSecret } = body || {};

    if (typeof billId !== 'string') {
      return NextResponse.json(
        { error: 'Missing billId.' },
        { status: 400 }
      );
    }
    const amount = Number(amountLocal);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'amountLocal must be a positive number.' },
        { status: 400 }
      );
    }

    const fxRate = FX_RATES[(currency || '').toUpperCase()] ?? 56.0;

    const result = (await payBillOnStellar({
      amountLocal: amount,
      currency,
      senderSecret: senderSecret || undefined,
      fxRate,
    })) as PayResult;

    return NextResponse.json({
      success: result.success,
      txHash: result.txHash,
      destination: result.destination,
      sendAssetCode: result.sendAssetCode,
      destAssetCode: result.destAssetCode,
      sendMax: result.sendMax,
      destAmount: result.destAmount,
      pathLength: result.pathLength,
      direct: result.direct,
      senderPublicKey: result.senderKeypair.publicKey(),
      message: result.message,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: message, success: false },
      { status: 500 }
    );
  }
}
