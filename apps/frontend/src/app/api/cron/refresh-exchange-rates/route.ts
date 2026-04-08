import { NextRequest, NextResponse } from "next/server";
import {
  ECB_SUPPORTED_CURRENCY_CODES,
  SUPPORTED_CURRENCIES,
} from "@/lib/currencies";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CRON_SECRET = process.env.CRON_SECRET as string;

type FrankfurterResponse = {
  base: string;
  date: string;
  rates: Record<string, number>;
};

type NbuRateResponse = Array<{
  cc: string;
  rate: number;
}>;

type OpenExchangeRatesResponse = {
  result?: string;
  time_last_update_utc?: string;
  rates?: Record<string, number>;
};

function isCronAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("Authorization");
  return Boolean(CRON_SECRET) && authHeader === `Bearer ${CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ecbSymbols = ECB_SUPPORTED_CURRENCY_CODES.join(",");
    const [ecbResponse, nbuResponse, fallbackResponse] = await Promise.all([
      fetch(`https://api.frankfurter.app/latest?from=USD&to=${ecbSymbols}`, {
        next: { revalidate: 0 },
      }),
      fetch(
        "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json",
        {
          next: { revalidate: 0 },
        },
      ),
      fetch("https://open.er-api.com/v6/latest/USD", {
        next: { revalidate: 0 },
      }),
    ]);

    if (!ecbResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch ECB rates", status: ecbResponse.status },
        { status: 502 },
      );
    }

    const ecbData = (await ecbResponse.json()) as FrankfurterResponse;
    const nbuData = nbuResponse.ok
      ? ((await nbuResponse.json()) as NbuRateResponse)
      : [];
    const fallbackData = fallbackResponse.ok
      ? ((await fallbackResponse.json()) as OpenExchangeRatesResponse)
      : null;

    const usdToUahRate = nbuData.find((row) => row.cc === "USD")?.rate;
    const supportedCodes = new Set(
      SUPPORTED_CURRENCIES.map((item) => item.code),
    );
    const fallbackRates = Object.fromEntries(
      Object.entries(fallbackData?.rates ?? {}).filter(([currency, rate]) => {
        return supportedCodes.has(currency) && Number.isFinite(rate);
      }),
    );
    const allRates: Record<string, number> = {
      ...fallbackRates,
      ...ecbData.rates,
      ...(usdToUahRate ? { UAH: usdToUahRate } : {}),
    };

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const rows = Object.entries(allRates).map(([currency, rate]) => ({
      base_currency: "USD",
      target_currency: currency,
      rate,
      updated_at: now,
    }));

    const { error } = await supabase.from("exchange_rates").upsert(rows, {
      onConflict: "base_currency,target_currency",
    });

    if (error) {
      return NextResponse.json(
        { error: "DB upsert failed", detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      date: ecbData.date,
      currencies: Object.keys(allRates).length,
      includes_uah: Boolean(usdToUahRate),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
