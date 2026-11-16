/**
 * Calendar days as integers (days since 1970-01-01), independent of time zone and DST.
 * All date math in the plugin works on these day numbers.
 */
export type Day = number;

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Day number for a calendar date (month 1–12). */
export function day_from_parts(year: number, month: number, day: number): Day {
	return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

/** Calendar parts (month 1–12) of a day number. */
export function day_to_parts(day: Day): { year: number; month: number; day: number } {
	const date = new Date(day * MS_PER_DAY);
	return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** Parse "YYYY-MM-DD"; null if malformed or not a real date (e.g. 2026-02-30). */
export function parse_date(text: string): Day | null {
	const match = ISO_DATE.exec(text.trim());
	if (!match) return null;
	const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
	const result = day_from_parts(year, month, day);
	const check = day_to_parts(result);
	return check.month === month && check.day === day ? result : null;
}

/** Format a day number as "YYYY-MM-DD". */
export function format_date(day: Day): string {
	const { year, month, day: dom } = day_to_parts(day);
	return `${year}-${String(month).padStart(2, '0')}-${String(dom).padStart(2, '0')}`;
}

/** Local calendar day of a timestamp (default: now). */
export function today(now: Date = new Date()): Day {
	return day_from_parts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** ISO weekday of a day number: 1 = Monday … 7 = Sunday. */
export function weekday(day: Day): number {
	// 1970-01-01 was a Thursday (ISO 4).
	return ((((day + 3) % 7) + 7) % 7) + 1;
}

/** Number of days in a month (month 1–12). */
export function days_in_month(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Add calendar months; the day of month is clamped (Jan 31 + 1 month = Feb 28/29). */
export function add_months(day: Day, months: number): Day {
	const parts = day_to_parts(day);
	const index = parts.year * 12 + (parts.month - 1) + months;
	const year = Math.floor(index / 12);
	const month = (index % 12) + 1;
	return day_from_parts(year, month, Math.min(parts.day, days_in_month(year, month)));
}
