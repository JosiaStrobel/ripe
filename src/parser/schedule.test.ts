import { describe, expect, it } from 'vitest';
import { format_date, parse_date } from './date';
import { next_occurrence, parse_schedule, type Schedule } from './schedule';

/** Next occurrence as ISO string, for readable assertions. */
function next(schedule: Schedule | null, from: string): string {
	if (!schedule) throw new Error('schedule not parsed');
	return format_date(next_occurrence(schedule, parse_date(from) ?? 0));
}

describe('parse_schedule', () => {
	it('parses weekdays in German and English', () => {
		expect(parse_schedule('Dienstag')).toEqual({ kind: 'weekly', weekdays: [2] });
		expect(parse_schedule('do, mo')).toEqual({ kind: 'weekly', weekdays: [1, 4] });
		expect(parse_schedule('friday sun fr')).toEqual({ kind: 'weekly', weekdays: [5, 7] });
	});

	it('parses day of month', () => {
		expect(parse_schedule('monatlich 1')).toEqual({ kind: 'monthly', day_of_month: 1 });
		expect(parse_schedule('monthly 31.')).toEqual({ kind: 'monthly', day_of_month: 31 });
	});

	it('rejects unknown rules', () => {
		expect(parse_schedule('')).toBeNull();
		expect(parse_schedule('dienstag, bald')).toBeNull();
		expect(parse_schedule('monatlich 32')).toBeNull();
		expect(parse_schedule('jeden 2. montag')).toBeNull();
	});
});

describe('next_occurrence', () => {
	// 2026-11-16 is a Monday.
	it('finds the next weekday, including today', () => {
		expect(next(parse_schedule('dienstag'), '2026-11-16')).toBe('2026-11-17');
		expect(next(parse_schedule('montag'), '2026-11-16')).toBe('2026-11-16');
		expect(next(parse_schedule('mo, do'), '2026-11-18')).toBe('2026-11-19');
		expect(next(parse_schedule('mo'), '2026-11-17')).toBe('2026-11-23');
	});

	it('finds the next day of month, clamped to the month end', () => {
		expect(next(parse_schedule('monatlich 1'), '2026-11-16')).toBe('2026-12-01');
		expect(next(parse_schedule('monatlich 16'), '2026-11-16')).toBe('2026-11-16');
		expect(next(parse_schedule('monatlich 31'), '2027-02-01')).toBe('2027-02-28');
		expect(next(parse_schedule('monatlich 5'), '2026-12-20')).toBe('2027-01-05');
	});
});
