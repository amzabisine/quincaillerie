import { dbError } from "@/lib/utils";

/** What every backend write returns: the data, or a readable error message. */
export type Result<T = null> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = (error: { message: string } | string | null | undefined): Result<never> =>
  ({ ok: false, error: typeof error === "string" ? error : dbError(error) });
