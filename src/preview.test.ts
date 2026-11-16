import { describe, expect, it } from 'vitest';
import { parse_date } from './parser/date';
import { parse_todo, type TodoTiming } from './parser/todo';
import { preview_days } from './preview';

const TODAY = parse_date('2026-11-16') ?? 0;
const LINEAR = { curve_exponent: 1 };

/** Timing of a task line. */
function timing(line: string): TodoTiming {
	const todo = parse_todo(line, { default_importance: 2 });
	if (!todo) throw new Error(`not a task: ${line}`);
	return todo.timing;
}

/** Levels as a compact string: "." hidden, digits = level. */
function levels(line: string, curve = 1): string {
	const preview = preview_days(timing(line), TODAY, { curve_exponent: curve });
	return preview?.days.map((d) => (d.level === null ? '.' : String(d.level))).join('') ?? 'none';
}

describe('preview_days', () => {
	it('shows 10 days before and 3 after the critical day', () => {
		// start = today, critical = today + 6
		expect(levels('- [ ] A [erstellt:: 2026-11-16] [kritisch_nach:: 6d]')).toBe('....0011223333');
	});

	it('changes with the curve', () => {
		expect(levels('- [ ] A [erstellt:: 2026-11-16] [kritisch_nach:: 6d]', 2)).toBe('....0000123333');
	});

	it('extends to the first visible day for long windows', () => {
		const preview = preview_days(
			timing('- [ ] F [fällig:: 2026-12-01] [vorlauf:: 3w] [puffer:: 1w]'),
			TODAY,
			LINEAR,
		);
		// start 11-10, due 12-01 → 22 before + due + 3 after
		expect(preview?.days).toHaveLength(26);
		expect(preview?.days[0]?.level).toBeNull();
		expect(preview?.days[1]?.level).toBe(0);
	});

	it('keeps the days fixed when only the buffer changes', () => {
		const range = (buffer: string): number[] | undefined =>
			preview_days(
				timing(`- [ ] F [fällig:: 2026-11-26] [vorlauf:: 1w] [puffer:: ${buffer}]`),
				TODAY,
				LINEAR,
			)?.days.map((d) => d.day);
		expect(range('2d')).toEqual(range('0d'));
		expect(range('5d')).toEqual(range('0d'));
		expect(range('0d')?.[10]).toBe(parse_date('2026-11-26')); // anchor = due date
	});

	it('caps very long windows', () => {
		const preview = preview_days(timing('- [ ] S [fällig:: 2027-05-31] [vorlauf:: 2m]'), TODAY, LINEAR);
		expect(preview?.days).toHaveLength(42);
		expect(preview?.days[38]?.day).toBe(parse_date('2027-05-31'));
	});

	it('previews never-done intervals as done today', () => {
		const preview = preview_days(timing('- [ ] G [alle:: 6d] [toleranz:: 3d]'), TODAY, LINEAR);
		expect(preview?.window).toEqual({ start: TODAY + 6, critical: TODAY + 9 });
	});

	it('has no preview without timing', () => {
		expect(levels('- [ ] Irgendwas')).toBe('none');
	});
});
