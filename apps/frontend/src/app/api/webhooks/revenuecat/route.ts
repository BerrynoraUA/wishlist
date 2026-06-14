import { NextRequest, NextResponse } from "next/server";
import {
  RevenueCatConfigError,
  RevenueCatFetchError,
  syncRevenueCatSubscriber,
} from "@/lib/subscription-sync-server";

const RC_WEBHOOK_AUTH_KEY = process.env.REVENUECAT_WEBHOOK_AUTH_KEY as string;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!RC_WEBHOOK_AUTH_KEY || authHeader !== `Bearer ${RC_WEBHOOK_AUTH_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const event = body?.event;
    if (!event) {
      return NextResponse.json({ error: "Missing event payload" }, { status: 400 });
    }

    const eventType: string = event.type;
    const appUserId: string | undefined = event.app_user_id;

    if (!appUserId) {
      return NextResponse.json({ error: "Missing app_user_id" }, { status: 400 });
    }

    const status = await syncRevenueCatSubscriber(appUserId);

    console.log(
      `[RevenueCat Webhook] ${eventType} for user ${appUserId} -> plan=${status.plan}, active=${status.isActive}`,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof RevenueCatConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    if (err instanceof RevenueCatFetchError) {
      console.error("[RevenueCat Webhook] RevenueCat API error:", err.status, err.body);
      return NextResponse.json({ error: err.message }, { status: 502 });
    }

    console.error("[RevenueCat Webhook] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
