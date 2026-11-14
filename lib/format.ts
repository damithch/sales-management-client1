const moneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: process.env.CURRENCY || "LKR",
  maximumFractionDigits: 0,
});

export const money = (value: number) => moneyFormat.format(value);
export const units = (value: number) => value.toLocaleString("en-US");

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function today() {
  return isoDate(new Date());
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(value: unknown): string | null {
  if (typeof value !== "string" || !DATE.test(value)) return null;
  const date = new Date(value + "T00:00:00Z");
  return Number.isNaN(date.getTime()) || isoDate(date) !== value ? null : value;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function parseId(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value : null;
}
