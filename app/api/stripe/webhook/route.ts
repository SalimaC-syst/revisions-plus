import { NextResponse } from "next/server";
import { stripeClient, handleStripeEvent } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new NextResponse("Stripe non configuré", { status: 503 });
  const body = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new NextResponse("Signature invalide", { status: 400 });
  }
  try {
    await handleStripeEvent(event as any, stripe);
  } catch (e) {
    await prisma.errorLog.create({ data: { message: `Webhook ${event.type}: ${(e as Error).message}`, stack: (e as Error).stack, path: "/api/stripe/webhook" } });
    return new NextResponse("Erreur", { status: 500 }); // Stripe renverra l'événement
  }
  return NextResponse.json({ received: true });
}
