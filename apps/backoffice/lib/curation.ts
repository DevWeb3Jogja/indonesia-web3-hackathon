import { CurationError } from "@iw3h/db";
import { NextResponse } from "next/server";

const STATUS: Record<CurationError["code"], number> = {
  closed: 409,
  no_org: 409,
  invalid_project: 404,
  not_passed: 409,
  invalid_criteria: 400,
  quota_full: 409,
  conflict: 403,
  is_finalist: 409,
};

/** CurationError → 4xx dengan pesan yang aman ditampilkan; error lain dilempar ulang. */
export function curationErrorResponse(e: unknown): Response {
  if (e instanceof CurationError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: STATUS[e.code] });
  }
  throw e;
}
