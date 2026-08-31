import { ConfigError } from "@iw3h/db";
import { NextResponse } from "next/server";

/** Map ConfigError → HTTP: in_use=409 (masih direferensi), not_found=404. Selain itu rethrow. */
export function configErrorResponse(e: unknown): NextResponse {
  if (e instanceof ConfigError) {
    return NextResponse.json({ error: e.message }, { status: e.code === "in_use" ? 409 : 404 });
  }
  throw e;
}
