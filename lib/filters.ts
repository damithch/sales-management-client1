import { isoDate, parseDate, parseId } from "./format";

export type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

/** Reads the from / to / brand / shop query parameters, ignoring invalid values. */
export async function readFilters(searchParams: SearchParams) {
  const params = await searchParams;
  return {
    from: parseDate(params.from),
    to: parseDate(params.to),
    brandId: parseId(params.brand),
    shopId: parseId(params.shop),
  };
}

/** First day of the month, five months before the given date. */
export function sixMonthsBefore(date: string) {
  const start = new Date(date + "T00:00:00Z");
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - 5);
  return isoDate(start);
}
