export function officeDayKey(
  d: Date = new Date(),
  tz: string = process.env.OFFICE_TIMEZONE?.trim() || "Africa/Dar_es_Salaam",
): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
