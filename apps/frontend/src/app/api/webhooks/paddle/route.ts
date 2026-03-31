import { NextRequest, NextResponse } from "next/server";
import {
  handlePaddleEvent,
  parsePaddleEvent,
  verifyPaddleSignature,
} from "./helpers";
import type { PaddleEvent } from "@/types/paddle";

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET as string;

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("Paddle-Signature");

  if (!verifyPaddleSignature(rawBody, signature, PADDLE_WEBHOOK_SECRET)) {
    console.error("[Paddle Webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: PaddleEvent;
  try {
    body = parsePaddleEvent(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await handlePaddleEvent(body);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[Paddle Webhook] Error handling ${body.event_type}:`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
