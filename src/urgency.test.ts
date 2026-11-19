import { describe, expect, it } from 'vitest';
import { parse_date } from './parser/date';
import { parse_todo, type Todo } from './parser/todo';
import {
	compare_urgency,
	compute_urgency,
	hidden_info,
	start_u,
	urgency_in_window,
	urgency_level,
	type Urgency,
} from './urgency';

/** Parse a task line; fails the test if it is not one. */
function todo(line: string): Todo {
	const result = parse_todo(line, { default_importance: 2 });
	if (!result) throw new Error(`not a task: ${line}`);
	return result;
}

/** Urgency of a line on an ISO date. */
function at(line: string, date: string, curve_exponent = 1): Urgency {
	return compute_urgency(todo(line), parse_date(date) ?? 0, { curve_exponent });
}

describe('interval tasks (after completion)', () => {
	const line = '- [ ] Gießen [alle:: 6d] [toleranz:: 3d] [zuletzt:: 2026-11-10]';

	it('follows the watering example from the concept', () => {
		expect(at(line, '2026-11-15').visible).toBe(false); // day 5
		expect(at(line, '2026-11-16')).toMatchObject({ visible: true, u: 0 }); // day 6
		expect(at(line, '2026-11-17').u).toBeCloseTo(1 / 3);
		expect(at(line, '2026-11-18').u).toBeCloseTo(2 / 3);
		expect(at(line, '2026-11-19')).toMatchObject({ u: 1, overdue_days: 0 }); // day 9
		expect(at(line, '2026-11-22')).toMatchObject({ u: 1, overdue_days: 3 });
	});

	it('is visible at u = 0 if never done', () => {
		expect(at('- [ ] Gießen [alle:: 6d] [toleranz:: 3d]', '2026-11-16')).toMatchObject({
			visible: true,
			u: 0,
			window: null,
		});
	});
});

describe('calendar tasks', () => {
	// 2026-11-17 is a Tuesday.
	const line = '- [ ] Müll [jeden:: dienstag] [vorlauf:: 2d] [zuletzt:: 2026-11-10]';

	it('appears with lead time and is critical on the day', () => {
		expect(at(line, '2026-11-14').visible).toBe(false);
		expect(at(line, '2026-11-15')).toMatchObject({ visible: true, u: 0 });
		expect(at(line, '2026-11-16').u).toBeCloseTo(0.5);
		expect(at(line, '2026-11-17').u).toBe(1);
		expect(at(line, '2026-11-19').overdue_days).toBe(2);
	});

	it('skips to the next date after completion', () => {
		const done = line.replace('2026-11-10', '2026-11-17');
		expect(at(done, '2026-11-18').visible).toBe(false);
		expect(at(done, '2026-11-22').visible).toBe(true);
	});

	it('counts completion within the lead for the upcoming date', () => {
		const early = line.replace('2026-11-10', '2026-11-16'); // Monday before Tuesday
		expect(at(early, '2026-11-17').visible).toBe(false);
		expect(at(early, '2026-11-22').visible).toBe(true); // lead for 2026-11-24
	});

	it('uses the next date from today if never done', () => {
		const fresh = '- [ ] Müll [jeden:: dienstag]';
		expect(at(fresh, '2026-11-16').visible).toBe(false);
		expect(at(fresh, '2026-11-17').u).toBe(1);
	});
});

describe('deadline tasks', () => {
	const line = '- [ ] Flug [fällig:: 2026-12-01] [vorlauf:: 3w] [puffer:: 1w]';

	it('ripens between lead and buffer', () => {
		expect(at(line, '2026-11-09').visible).toBe(false);
		expect(at(line, '2026-11-10').u).toBe(0);
		expect(at(line, '2026-11-17').u).toBeCloseTo(0.5);
		expect(at(line, '2026-11-24').u).toBe(1);
		expect(at(line, '2026-12-02').overdue_days).toBe(8);
	});

	it('is critical on the due date without lead or buffer', () => {
		const bare = '- [ ] Flug [fällig:: 2026-12-01]';
		expect(at(bare, '2026-11-30').visible).toBe(false);
		expect(at(bare, '2026-12-01')).toMatchObject({ u: 1, overdue_days: 0 });
	});

	it('handles a buffer longer than the lead', () => {
		const odd = '- [ ] Flug [fällig:: 2026-12-01] [vorlauf:: 1d] [puffer:: 1w]';
		expect(at(odd, '2026-11-24').u).toBe(1);
	});
});

describe('aging tasks', () => {
	const line = '- [ ] Anna [erstellt:: 2026-11-16] [kritisch_nach:: 4d]';

	it('ages from creation', () => {
		expect(at(line, '2026-11-15').visible).toBe(false);
		expect(at(line, '2026-11-16').u).toBe(0);
		expect(at(line, '2026-11-17').u).toBeCloseTo(0.25);
		expect(at(line, '2026-11-17', 2).u).toBeCloseTo(0.0625);
		expect(at(line, '2026-11-20').u).toBe(1);
	});
});

describe('common rules', () => {
	it('shows tasks without timing at u = 0', () => {
		expect(at('- [ ] Irgendwas', '2026-11-16')).toMatchObject({ visible: true, u: 0 });
	});

	it('hides done tasks', () => {
		expect(at('- [x] Anna [erstellt:: 2026-11-16] [kritisch_nach:: 4d]', '2026-11-20').visible).toBe(
			false,
		);
	});

	it('hides snoozed tasks until the snooze date', () => {
		const line = '- [ ] Anna [erstellt:: 2026-11-01] [kritisch_nach:: 4d] [pausiert_bis:: 2026-11-20]';
		expect(at(line, '2026-11-19').visible).toBe(false);
		expect(at(line, '2026-11-20')).toMatchObject({ visible: true, u: 1, overdue_days: 15 });
	});

	it('maps urgency to color levels; red only when critical', () => {
		const window = { start: 0, critical: 10 };
		const level = (u: number): number | null =>
			urgency_level({ visible: true, u, overdue_days: 0, window });
		expect([0, 0.3, 0.34, 0.66, 0.67, 0.99, 1].map(level)).toEqual([0, 0, 1, 1, 2, 2, 3]);
		expect(urgency_level({ visible: true, u: 0, overdue_days: 0, window: null })).toBeNull();
	});

	it('sorts by urgency, then by overdue days', () => {
		const list: Urgency[] = [
			{ visible: true, u: 0.5, overdue_days: 0, window: null },
			{ visible: true, u: 1, overdue_days: 1, window: null },
			{ visible: true, u: 1, overdue_days: 4, window: null },
		];
		expect(list.sort(compare_urgency).map((x) => [x.u, x.overdue_days])).toEqual([
			[1, 4],
			[1, 1],
			[0.5, 0],
		]);
	});
});

describe('hidden_info', () => {
	const day = (iso: string): number => parse_date(iso) ?? 0;
	const info = (line: string, date: string): ReturnType<typeof hidden_info> =>
		hidden_info(todo(line), day(date));

	it('reports when a task becomes visible', () => {
		const line = '- [ ] Gießen [alle:: 6d] [toleranz:: 3d] [zuletzt:: 2026-11-10]';
		expect(info(line, '2026-11-12')).toEqual({ until: day('2026-11-16'), paused: false });
		expect(info(line, '2026-11-16')).toBeNull();
	});

	it('reports snoozed tasks, taking the later of snooze and start', () => {
		const snoozed = '- [ ] A [erstellt:: 2026-11-01] [kritisch_nach:: 4d] [pausiert_bis:: 2026-11-20]';
		expect(info(snoozed, '2026-11-16')).toEqual({ until: day('2026-11-20'), paused: true });
		const both = '- [ ] F [fällig:: 2026-12-10] [vorlauf:: 1w] [pausiert_bis:: 2026-11-20]';
		expect(info(both, '2026-11-16')).toEqual({ until: day('2026-12-03'), paused: false });
	});

	it('ignores done and visible tasks', () => {
		expect(info('- [x] A [fällig:: 2026-12-10] [vorlauf:: 1w]', '2026-11-16')).toBeNull();
		expect(info('- [ ] Irgendwas', '2026-11-16')).toBeNull();
	});
});

describe('start level', () => {
	const window = { start: 100, critical: 110 };
	const linear = { curve_exponent: 1 };

	it('lifts the first visible day to the level and rises to 1', () => {
		expect(urgency_level(urgency_in_window(window, 100, linear, 2))).toBe(1);
		expect(urgency_in_window(window, 105, linear, 3).u).toBeCloseTo(2 / 3 + 1 / 6);
		expect(urgency_in_window(window, 100, linear, 4).u).toBe(1);
		expect(urgency_in_window(window, 99, linear, 4).visible).toBe(false);
	});

	it('defaults to 1 and is read from the line', () => {
		expect(start_u(1)).toBe(0);
		const todo = parse_todo('- [ ] A [startstufe:: 3]', { default_importance: 2 });
		expect(todo?.start_level).toBe(3);
		expect(parse_todo('- [ ] A [startstufe:: 9]', { default_importance: 2 })?.errors).toHaveLength(1);
	});
});
