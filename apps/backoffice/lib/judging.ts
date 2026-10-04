import { JudgingError } from "@iw3h/db";
import { NextResponse } from "next/server";

const STATUS: Record<JudgingError["code"], number> = {
  invalid_project: 404,
  out_of_track: 403,
  invalid_criteria: 400,
};

/** JudgingError → 4xx dengan pesan yang aman ditampilkan; error lain dilempar ulang. */
export function judgingErrorResponse(e: unknown): Response {
  if (e instanceof JudgingError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: STATUS[e.code] });
  }
  throw e;
}
