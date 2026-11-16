import { describe, expect, it } from 'vitest';
import { add_months, format_date, parse_date, today, weekday } from './date';
import { add_duration, format_duration, parse_duration } from './duration';

describe('date', () => {
	it('round-trips ISO dates', () => {
		const day = parse_date('2026-11-16');
		expect(day).not.toBeNull();
		expect(format_date(day ?? 0)).toBe('2026-11-16');
		expect(parse_date('1970-01-01')).toBe(0);
	});

	it('rejects malformed and impossible dates', () => {
		expect(parse_date('2026-2-3')).toBeNull();
		expect(parse_date('2026-02-30')).toBeNull();
		expect(parse_date('morgen')).toBeNull();
	});

	it('computes ISO weekdays', () => {
		expect(weekday(parse_date('2026-11-16') ?? 0)).toBe(1); // Monday
		expect(weekday(parse_date('2026-11-22') ?? 0)).toBe(7); // Sunday
		expect(weekday(parse_date('1969-12-31') ?? 0)).toBe(3); // Wednesday, negative day
	});

	it('takes the local calendar day', () => {
		expect(format_date(today(new Date(2026, 2, 29, 23, 30)))).toBe('2026-03-29');
		expect(format_date(today(new Date(2026, 9, 25, 0, 30)))).toBe('2026-10-25');
	});

	it('clamps month addition to the month end', () => {
		const jan31 = parse_date('2026-01-31') ?? 0;
		expect(format_date(add_months(jan31, 1))).toBe('2026-02-28');
		expect(format_date(add_months(jan31, 13))).toBe('2027-02-28');
		expect(format_date(add_months(parse_date('2026-03-15') ?? 0, -3))).toBe('2025-12-15');
	});
});

describe('duration', () => {
	it('parses d/w/m', () => {
		expect(parse_duration('6d')).toEqual({ amount: 6, unit: 'd' });
		expect(parse_duration(' 3W ')).toEqual({ amount: 3, unit: 'w' });
		expect(parse_duration('1m')).toEqual({ amount: 1, unit: 'm' });
		expect(parse_duration('6')).toBeNull();
		expect(parse_duration('1y')).toBeNull();
		expect(format_duration({ amount: 2, unit: 'w' })).toBe('2w');
	});

	it('adds and subtracts durations', () => {
		const day = parse_date('2026-11-16') ?? 0;
		expect(format_date(add_duration(day, { amount: 6, unit: 'd' }))).toBe('2026-11-22');
		expect(format_date(add_duration(day, { amount: 1, unit: 'w' }, -1))).toBe('2026-11-09');
		expect(format_date(add_duration(day, { amount: 2, unit: 'm' }))).toBe('2027-01-16');
	});
});
