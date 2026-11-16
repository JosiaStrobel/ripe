import { format_date, parse_date, type Day } from './parser/date';
import { add_duration, format_duration, parse_duration } from './parser/duration';
import { parse_fields, remove_field, set_field } from './parser/fields';
import {
	ALIASES,
	FIELD,
	field_map,
	KIND_FIELDS,
	parse_todo,
	type TodoError,
	type TodoKind,
	type TodoTiming,
} from './parser/todo';

/**
 * Editable form of a task, as used by the input dialog. Values are kept as text,
 * so the dialog can show exactly what was typed; validation reuses the parser.
 */
export interface TaskDraft {
	title: string;
	kind: TodoKind;
	values: Partial<Record<DraftField, string>>;
	importance: number;
}

/** Timing fields the dialog edits. */
export type DraftField =
	| 'every'
	| 'tolerance'
	| 'last_done'
	| 'schedule'
	| 'lead'
	| 'buffer'
	| 'due'
	| 'created'
	| 'critical_after';

/** Dialog fields per kind, in display order. */
export const KIND_DRAFT_FIELDS: Readonly<Record<TodoKind, readonly DraftField[]>> = {
	interval: ['every', 'tolerance', 'last_done'],
	calendar: ['schedule', 'lead', 'last_done'],
	deadline: ['due', 'lead', 'buffer'],
	aging: ['critical_after', 'created'],
	none: [],
};

/** Order of the kinds in the dialog. */
export const KINDS: readonly TodoKind[] = ['aging', 'deadline', 'interval', 'calendar', 'none'];

const MANAGED_FIELDS: readonly DraftField[] = [
	'every',
	'tolerance',
	'schedule',
	'due',
	'lead',
	'buffer',
	'created',
	'critical_after',
	'last_done',
];

/** Draft field for a stored field key (e.g. "toleranz" → "tolerance"). */
export function draft_field_for_key(key: string | undefined): DraftField | undefined {
	return MANAGED_FIELDS.find((name) => FIELD[name] === key);
}

const TASK_PREFIX =/^(\s*[-*+]\s+\[.\])\s?(.*)$/;
const NEW_TASK_PREFIX = '- [ ]';

/** Empty draft for a new task. */
export function empty_draft(kind: TodoKind, today: Day, importance: number): TaskDraft {
	const values: TaskDraft['values'] = kind === 'aging' ? { created: format_date(today) } : {};
	return { title: '', kind, values, importance };
}

/** Kind of a line from its fields, also for invalid lines (first match wins). */
function detect_kind(fields: Map<string, string>): TodoKind {
	return KIND_FIELDS.find(([, key]) => fields.has(key))?.[0] ?? 'none';
}

/** Draft for editing an existing task line. */
export function draft_from_line(line: string, default_importance: number): TaskDraft | null {
	const todo = parse_todo(line, { default_importance });
	if (!todo) return null;
	const fields = field_map(line);
	const values: TaskDraft['values'] = {};
	for (const name of MANAGED_FIELDS) {
		const value = fields.get(FIELD[name]);
		if (value !== undefined) values[name] = value;
	}
	return { title: todo.title, kind: detect_kind(fields), values, importance: todo.importance };
}

/** Replace the title text of a task line; fields and wiki links stay, in their order. */
function replace_title(line: string, title: string): string {
	const match = TASK_PREFIX.exec(line);
	if (!match) return line;
	const rest = match[2] ?? '';
	const fields = parse_fields(rest);
	const kept: Array<{ start: number; text: string }> = fields.map((f) => ({
		start: f.start,
		text: rest.slice(f.start, f.end),
	}));
	for (const link of rest.matchAll(/\[\[[^\]]*\]\]/g)) {
		const start = link.index;
		if (!fields.some((f) => start >= f.start && start < f.end)) kept.push({ start, text: link[0] });
	}
	kept.sort((a, b) => a.start - b.start);
	return [match[1], title.trim(), ...kept.map((k) => k.text)].filter((s) => s).join(' ');
}

/** Set or remove a field, writing the canonical key (alias spellings are replaced). */
function put_field(line: string, key: string, value: string | undefined): string {
	let result = line;
	for (const [alias, canonical] of Object.entries(ALIASES)) {
		if (canonical === key) result = remove_field(result, alias);
	}
	return value ? set_field(result, key, value) : remove_field(result, key);
}

/**
 * Apply a draft to a line (or create a new line with `line` = null).
 * Only title, timing fields of all kinds and importance are touched; fields of
 * other kinds are removed, everything else (note link, log, unknown fields) stays.
 */
export function apply_draft(line: string | null, draft: TaskDraft, default_importance: number): string {
	let result = replace_title(line ?? NEW_TASK_PREFIX, draft.title);
	const own = KIND_DRAFT_FIELDS[draft.kind];
	for (const name of MANAGED_FIELDS) {
		const value = own.includes(name) ? draft.values[name]?.trim() : undefined;
		result = put_field(result, FIELD[name], value);
	}
	const had_importance = field_map(result).has(FIELD.importance);
	if (had_importance || draft.importance !== default_importance) {
		result = set_field(result, FIELD.importance, String(draft.importance));
	}
	return result;
}

/** Problems of a draft: parser errors of the resulting line, plus a missing title. */
export function validate_draft(draft: TaskDraft, default_importance: number): TodoError[] {
	const errors: TodoError[] = draft.title.trim() ? [] : [{ code: 'missing_field', field: 'title' }];
	const todo = parse_todo(apply_draft(null, draft, default_importance), { default_importance });
	return [...errors, ...(todo?.errors ?? [])];
}

/** Timing the draft would produce; { kind: 'none' } if incomplete or invalid. */
export function draft_timing(draft: TaskDraft, default_importance: number): TodoTiming {
	const todo = parse_todo(apply_draft(null, draft, default_importance), { default_importance });
	return todo?.timing ?? { kind: 'none' };
}

/** Lead time from a "visible from" date to the due date ("3w" or "12d"); null if invalid. */
export function lead_from_date(due_text: string, from_text: string): string | null {
	const due = parse_date(due_text);
	const from = parse_date(from_text);
	if (due === null || from === null || from > due) return null;
	const days = due - from;
	return days > 0 && days % 7 === 0
		? format_duration({ amount: days / 7, unit: 'w' })
		: format_duration({ amount: days, unit: 'd' });
}

/** "Visible from" date for a due date and lead time; null if either is invalid. */
export function date_from_lead(due_text: string, lead_text: string): string | null {
	const due = parse_date(due_text);
	const lead = parse_duration(lead_text);
	if (due === null || !lead) return null;
	return format_date(add_duration(due, lead, -1));
}

/** Half of a duration, rounded up to whole days (weeks if even); suggested tolerance. */
export function half_duration(text: string): string | null {
	const duration = parse_duration(text);
	if (!duration || duration.amount === 0) return null;
	const days = duration.amount * { d: 1, w: 7, m: 30 }[duration.unit];
	const half = Math.ceil(days / 2);
	return half % 7 === 0
		? format_duration({ amount: half / 7, unit: 'w' })
		: format_duration({ amount: half, unit: 'd' });
}
