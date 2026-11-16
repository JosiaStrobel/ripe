import { day_from_parts, day_to_parts, days_in_month, weekday, type Day } from './date';

/**
 * Calendar rule of the `jeden` field. First version: weekdays ("dienstag", "mo, do")
 * and day of month ("monatlich 1"). New kinds are added to the union and the parser.
 */
export type Schedule =
	| { kind: 'weekly'; weekdays: number[] } // ISO weekdays 1–7, sorted
	| { kind: 'monthly'; day_of_month: number }; // 1–31, clamped to month end

/** Weekday names (German and English, full and short) → ISO weekday. */
const WEEKDAYS: Readonly<Record<string, number>> = {
	montag: 1, mo: 1, monday: 1, mon: 1,
	dienstag: 2, di: 2, tuesday: 2, tue: 2,
	mittwoch: 3, mi: 3, wednesday: 3, wed: 3,
	donnerstag: 4, do: 4, thursday: 4, thu: 4,
	freitag: 5, fr: 5, friday: 5, fri: 5,
	samstag: 6, sa: 6, saturday: 6, sat: 6,
	sonntag: 7, so: 7, sunday: 7, sun: 7,
};

const MONTHLY = /^(?:monatlich|monthly)\s+(\d{1,2})\.?$/;

/** Parse a `jeden` value; null if not understood. */
export function parse_schedule(text: string): Schedule | null {
	const value = text.trim().toLowerCase();
	const monthly = MONTHLY.exec(value);
	if (monthly) {
		const dom = Number(monthly[1]);
		return dom >= 1 && dom <= 31 ? { kind: 'monthly', day_of_month: dom } : null;
	}
	const names = value.split(/[,\s]+/).filter((name) => name.length > 0);
	if (names.length === 0) return null;
	const days = new Set<number>();
	for (const name of names) {
		const day = WEEKDAYS[name];
		if (day === undefined) return null;
		days.add(day);
	}
	return { kind: 'weekly', weekdays: [...days].sort((a, b) => a - b) };
}

/** First day ≥ `from` that matches the schedule. */
export function next_occurrence(schedule: Schedule, from: Day): Day {
	switch (schedule.kind) {
		case 'weekly': {
			const current = weekday(from);
			const offsets = schedule.weekdays.map((wd) => (wd - current + 7) % 7);
			return from + Math.min(...offsets);
		}
		case 'monthly': {
			const { year, month } = day_to_parts(from);
			const in_month = (y: number, m: number): Day =>
				day_from_parts(y, m, Math.min(schedule.day_of_month, days_in_month(y, m)));
			const candidate = in_month(year, month);
			if (candidate >= from) return candidate;
			return month === 12 ? in_month(year + 1, 1) : in_month(year, month + 1);
		}
	}
}
