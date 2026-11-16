import { add_months, type Day } from './date';

/** Duration unit: days, weeks, months. */
export type DurationUnit = 'd' | 'w' | 'm';

/** A duration like "6d", "3w", "1m". Months are calendar months, not 30 days. */
export interface Duration {
	amount: number;
	unit: DurationUnit;
}

const DURATION = /^(\d+)\s*([dwm])$/i;

/** Parse "6d" / "3w" / "1m"; null if malformed. */
export function parse_duration(text: string): Duration | null {
	const match = DURATION.exec(text.trim());
	if (!match) return null;
	return { amount: Number(match[1]), unit: (match[2] ?? 'd').toLowerCase() as DurationUnit };
}

/** Format a duration as stored in the file, e.g. "6d". */
export function format_duration(duration: Duration): string {
	return `${duration.amount}${duration.unit}`;
}

/** Add a duration to a day (sign = -1 subtracts). */
export function add_duration(day: Day, duration: Duration, sign: 1 | -1 = 1): Day {
	const amount = duration.amount * sign;
	switch (duration.unit) {
		case 'd':
			return day + amount;
		case 'w':
			return day + amount * 7;
		case 'm':
			return add_months(day, amount);
	}
}
