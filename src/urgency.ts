import type { Day } from './parser/date';
import { add_duration } from './parser/duration';
import { next_occurrence } from './parser/schedule';
import type { Todo, TodoTiming } from './parser/todo';

/** Time window of a task: visible from `start`, fully urgent from `critical`. */
export interface UrgencyWindow {
	start: Day;
	critical: Day;
}

/** Computed urgency of a task on a given day. */
export interface Urgency {
	visible: boolean;
	/** 0 (just appeared) … 1 (critical), after the curve is applied. */
	u: number;
	/** Days since the critical day (0 before and on it). */
	overdue_days: number;
	/** Window used, or null if the task has none (never done, no timing). */
	window: UrgencyWindow | null;
}

/** Options for the urgency calculation. */
export interface UrgencyOptions {
	/** Curve exponent k for u' = u^k; 1 = linear, > 1 rises slowly first. */
	curve_exponent: number;
}

export const DEFAULT_URGENCY_OPTIONS: Readonly<UrgencyOptions> = { curve_exponent: 1 };

const HIDDEN: Urgency = { visible: false, u: 0, overdue_days: 0, window: null };
const STATIC: Urgency = { visible: true, u: 0, overdue_days: 0, window: null };

/** Window for a timing; null if there is none (task stays visible at u = 0). */
export function urgency_window(timing: TodoTiming, today: Day): UrgencyWindow | null {
	switch (timing.kind) {
		case 'interval': {
			if (timing.last_done === null) return null;
			const start = add_duration(timing.last_done, timing.every);
			return { start, critical: add_duration(start, timing.tolerance) };
		}
		case 'calendar': {
			// Next date whose lead window starts after the last completion, so completing
			// early (within the lead) counts for the upcoming date. Never done: from today.
			const from =
				timing.last_done === null
					? today
					: (timing.lead ? add_duration(timing.last_done, timing.lead) : timing.last_done) + 1;
			const critical = next_occurrence(timing.schedule, from);
			const start = timing.lead ? add_duration(critical, timing.lead, -1) : critical;
			return { start, critical };
		}
		case 'deadline': {
			const start = timing.lead ? add_duration(timing.due, timing.lead, -1) : timing.due;
			const critical = timing.buffer ? add_duration(timing.due, timing.buffer, -1) : timing.due;
			return { start: Math.min(start, critical), critical };
		}
		case 'aging':
			return { start: timing.created, critical: add_duration(timing.created, timing.critical_after) };
		case 'none':
			return null;
	}
}

/** Urgency of a task on `today`. Done and snoozed tasks are hidden. */
export function compute_urgency(
	todo: Todo,
	today: Day,
	options: UrgencyOptions = DEFAULT_URGENCY_OPTIONS,
): Urgency {
	if (todo.done) return HIDDEN;
	if (todo.paused_until !== null && today < todo.paused_until) return HIDDEN;
	const window = urgency_window(todo.timing, today);
	return window ? urgency_in_window(window, today, options) : STATIC;
}

/** Urgency on `day` for a fixed window (used by the overview and the dialog preview). */
export function urgency_in_window(window: UrgencyWindow, day: Day, options: UrgencyOptions): Urgency {
	const { start, critical } = window;
	if (day < start) return { ...HIDDEN, window };
	if (day >= critical) return { visible: true, u: 1, overdue_days: day - critical, window };
	const linear = (day - start) / (critical - start);
	return { visible: true, u: linear ** Math.max(options.curve_exponent, 0.01), overdue_days: 0, window };
}

/** Number of color levels (green, yellow, orange, red). */
export const URGENCY_LEVELS = 4;

/** Color level 0 … URGENCY_LEVELS − 1 (last = critical); null for tasks without window. */
export function urgency_level(urgency: Urgency): number | null {
	if (!urgency.window) return null;
	if (urgency.u >= 1) return URGENCY_LEVELS - 1;
	return Math.min(Math.floor(urgency.u * (URGENCY_LEVELS - 1)), URGENCY_LEVELS - 2);
}

/** Sort order for the overview: most urgent first, then longest overdue. */
export function compare_urgency(a: Urgency, b: Urgency): number {
	return b.u - a.u || b.overdue_days - a.overdue_days;
}
