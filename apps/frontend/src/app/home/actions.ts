"use server";

import { runSeed } from "@/lib/supabase-reset";

export async function seedAction(): Promise<void> {
  await runSeed();
}
