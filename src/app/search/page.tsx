import { redirect } from "next/navigation";

/** /search is an alias that forwards into the marketplace search. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) qs.set(k, v);
  redirect(`/marketplace${qs.toString() ? `?${qs.toString()}` : ""}`);
}
