import type { NextRequest } from "next/server";
import { updateSession } from "@/server/db/session";

// Next.js 16 "proxy" (formerly middleware): runs before every matched request.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
