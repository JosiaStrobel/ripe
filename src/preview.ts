import type { Day } from './parser/date';
import type { TodoTiming } from './parser/todo';
import {
	urgency_in_window,
	urgency_level,
	urgency_window,
	type UrgencyOptions,
	type UrgencyWindow,
} from './urgency';

/** One day box of the color preview. */
export interface PreviewDay {
	day: Day;
	/** Color level, or null if the task is hidden that day. */
	level: number | null;
}

/** Color preview around the task's date. */
export interface Preview {
	window: UrgencyWindow;
	/** Fixed reference day: the due date for deadlines, otherwise the critical day. */
	anchor: Day;
	days: PreviewDay[];
}

/** Box counts of the preview. */
export interface PreviewRange {
	before: number;
	after: number;
	max: number;
}

export const DEFAULT_PREVIEW_RANGE: Readonly<PreviewRange> = { before: 10, after: 3, max: 42 };

/**
 * Daily color levels from before the anchor day until shortly after it. The anchor
 * stays fixed when only the buffer changes, so the boxes don't shift while typing.
 * The range grows to include the first visible day (plus one hidden day), up to `max`
 * boxes. Recurring tasks never done are previewed as if done today. Null without timing.
 */
export function preview_days(
	timing: TodoTiming,
	today: Day,
	options: UrgencyOptions,
	range: PreviewRange = DEFAULT_PREVIEW_RANGE,
): Preview | null {
	const effective: TodoTiming =
		timing.kind === 'interval' && timing.last_done === null ? { ...timing, last_done: today } : timing;
	const window = urgency_window(effective, today);
	if (!window) return null;
	const anchor = effective.kind === 'deadline' ? effective.due : window.critical;
	const before = Math.min(
		Math.max(range.before, anchor - window.start + 1),
		range.max - range.after - 1,
	);
	const days: PreviewDay[] = [];
	for (let day = anchor - before; day <= anchor + range.after; day++) {
		const urgency = urgency_in_window(window, day, options);
		days.push({ day, level: urgency.visible ? urgency_level(urgency) : null });
	}
	return { window, anchor, days };
}
