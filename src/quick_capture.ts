import { empty_draft, half_duration, type TaskDraft } from './draft';
import { parse_date, type Day } from './parser/date';
import { parse_duration } from './parser/duration';
import { parse_schedule } from './parser/schedule';

/** Result of the quick capture input. */
export interface QuickResult {
	draft: TaskDraft;
	/** True if a shortcut at the end of the text set the timing. */
	shortcut: boolean;
}

/** A shortcut pattern at the end of the text and how it fills the draft. */
interface Shortcut {
	pattern: RegExp;
	apply: (value: string, draft: TaskDraft) => boolean;
}

const SHORTCUTS: readonly Shortcut[] = [
	{
		// "… alle 6d" → recurring after completion, tolerance = half interval
		pattern: /^(.*?)\s+(?:alle|every)\s+(\S+)$/i,
		apply: (value, draft) => {
			const tolerance = half_duration(value);
			if (!tolerance) return false;
			draft.kind = 'interval';
			draft.values = { every: value, tolerance };
			return true;
		},
	},
	{
		// "… jeden dienstag" → fixed calendar
		pattern: /^(.*?)\s+(?:jeden|jede|every)\s+(.+)$/i,
		apply: (value, draft) => {
			if (!parse_schedule(value)) return false;
			draft.kind = 'calendar';
			draft.values = { schedule: value };
			return true;
		},
	},
	{
		// "… 2026-12-01" → deadline
		pattern: /^(.*?)\s+(\d{4}-\d{2}-\d{2})$/,
		apply: (value, draft) => {
			if (parse_date(value) === null) return false;
			draft.kind = 'deadline';
			draft.values = { due: value };
			return true;
		},
	},
	{
		// "… 5d" → aging
		pattern: /^(.*?)\s+(\d+[dwm])$/i,
		apply: (value, draft) => {
			draft.values.critical_after = value.toLowerCase();
			return true;
		},
	},
];

/**
 * Turn quick capture text into a draft. A shortcut at the end sets the timing;
 * otherwise the task ages with `fallback_duration` (chosen button or setting).
 */
export function parse_quick(
	text: string,
	today: Day,
	fallback_duration: string,
	importance: number,
): QuickResult {
	const trimmed = text.trim();
	for (const shortcut of SHORTCUTS) {
		const match = shortcut.pattern.exec(trimmed);
		const title = match?.[1]?.trim();
		if (!match || !title) continue;
		const draft = empty_draft('aging', today, importance);
		draft.title = title;
		if (shortcut.apply(match[2] ?? '', draft)) return { draft, shortcut: true };
	}
	const draft = empty_draft('aging', today, importance);
	draft.title = trimmed;
	if (parse_duration(fallback_duration)) draft.values.critical_after = fallback_duration;
	return { draft, shortcut: false };
}
