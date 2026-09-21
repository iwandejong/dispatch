import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";

/** Render the 404 page when a service reports NOT_FOUND; rethrow anything else. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
}
