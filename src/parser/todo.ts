import { parse_date, type Day } from './date';
import { parse_duration, type Duration } from './duration';
import { find_field, normalize_key, parse_fields, strip_fields, wiki_link_target } from './fields';
import { parse_schedule, type Schedule } from './schedule';

/** Field keys as written in the file (German, see docs/konzept.md 4.3). */
export const FIELD = {
	every: 'alle',
	schedule: 'jeden',
	tolerance: 'toleranz',
	last_done: 'zuletzt',
	due: 'fällig',
	lead: 'vorlauf',
	buffer: 'puffer',
	created: 'erstellt',
	critical_after: 'kritisch_nach',
	importance: 'wichtig',
	log: 'log',
	paused_until: 'pausiert_bis',
	done: 'erledigt',
} as const;

/** Alternative spellings accepted when reading; writing always uses FIELD. */
export const ALIASES: Readonly<Record<string, string>> = { faellig: FIELD.due };

/** Task kind, derived from which fields are present. */
export type TodoKind = 'interval' | 'calendar' | 'deadline' | 'aging' | 'none';

/** Problem in a todo line; codes map to UI texts later. */
export interface TodoError {
	code: 'missing_field' | 'invalid_value' | 'conflicting_kinds';
	field?: string;
}

/** Timing fields per kind. */
export type TodoTiming =
	| { kind: 'interval'; every: Duration; tolerance: Duration; last_done: Day | null }
	| { kind: 'calendar'; schedule: Schedule; lead: Duration | null; last_done: Day | null }
	| { kind: 'deadline'; due: Day; lead: Duration | null; buffer: Duration | null }
	| { kind: 'aging'; created: Day; critical_after: Duration }
	| { kind: 'none' };

/** A parsed todo line. The raw line stays the source of truth for writing. */
export interface Todo {
	raw: string;
	/** Status character inside the checkbox (" " = open). */
	status: string;
	done: boolean;
	/** Text without fields and without the note link. */
	title: string;
	/** Target of the detail note link outside the fields, if any. */
	note: string | null;
	/** Target of the log link, if any. */
	log: string | null;
	importance: number;
	paused_until: Day | null;
	done_on: Day | null;
	/** Valid timing, or { kind: 'none' } if absent or invalid (see errors). */
	timing: TodoTiming;
	errors: TodoError[];
}

/** Options for parsing. */
export interface ParseOptions {
	default_importance: number;
}

const TASK = /^\s*[-*+]\s+\[(.)\]\s?(.*)$/;

/** Field that identifies each task kind. */
export const KIND_FIELDS: ReadonlyArray<[TodoKind, string]> = [
	['interval', FIELD.every],
	['calendar', FIELD.schedule],
	['deadline', FIELD.due],
	['aging', FIELD.critical_after],
];

/** Collect field values by canonical key (first occurrence wins). */
export function field_map(line: string): Map<string, string> {
	const map = new Map<string, string>();
	for (const field of parse_fields(line)) {
		const key = normalize_key(field.key);
		const canonical = ALIASES[key] ?? key;
		if (!map.has(canonical)) map.set(canonical, field.value);
	}
	return map;
}

/** Typed field reader that records errors instead of throwing. */
class FieldReader {
	readonly errors: TodoError[] = [];

	/** Create a reader for the field values of one line. */
	constructor(private readonly fields: Map<string, string>) {}

	/** True if the field is present. */
	has(key: string): boolean {
		return this.fields.has(key);
	}

	/** Read an optional field; invalid values are reported and yield null. */
	optional<T>(key: string, parse: (text: string) => T | null): T | null {
		const text = this.fields.get(key);
		if (text === undefined) return null;
		const value = parse(text);
		if (value === null) this.errors.push({ code: 'invalid_value', field: key });
		return value;
	}

	/** Read a required field; missing or invalid values are reported and yield null. */
	required<T>(key: string, parse: (text: string) => T | null): T | null {
		if (!this.has(key)) {
			this.errors.push({ code: 'missing_field', field: key });
			return null;
		}
		return this.optional(key, parse);
	}
}

/** Parse importance 1–3. */
function parse_importance(text: string): number | null {
	const value = Number(text.trim());
	return Number.isInteger(value) && value >= 1 && value <= 3 ? value : null;
}

/** Read the timing fields for a kind; null if a required field is missing or invalid. */
function read_timing(kind: TodoKind, r: FieldReader): TodoTiming | null {
	switch (kind) {
		case 'interval': {
			const every = r.required(FIELD.every, parse_duration);
			const tolerance = r.required(FIELD.tolerance, parse_duration);
			const last_done = r.optional(FIELD.last_done, parse_date);
			return every && tolerance ? { kind, every, tolerance, last_done } : null;
		}
		case 'calendar': {
			const schedule = r.required(FIELD.schedule, parse_schedule);
			const lead = r.optional(FIELD.lead, parse_duration);
			const last_done = r.optional(FIELD.last_done, parse_date);
			return schedule ? { kind, schedule, lead, last_done } : null;
		}
		case 'deadline': {
			const due = r.required(FIELD.due, parse_date);
			const lead = r.optional(FIELD.lead, parse_duration);
			const buffer = r.optional(FIELD.buffer, parse_duration);
			return due !== null ? { kind, due, lead, buffer } : null;
		}
		case 'aging': {
			const critical_after = r.required(FIELD.critical_after, parse_duration);
			const created = r.required(FIELD.created, parse_date);
			return critical_after && created !== null ? { kind, created, critical_after } : null;
		}
		case 'none':
			return { kind };
	}
}

/** A task with its 0-based line number in the file. */
export interface TodoEntry {
	line_no: number;
	todo: Todo;
}

/** Parse all task lines of a file's content. */
export function parse_todo_lines(content: string, options: ParseOptions): TodoEntry[] {
	const entries: TodoEntry[] = [];
	content.split('\n').forEach((line, line_no) => {
		const todo = parse_todo(line.replace(/\r$/, ''), options);
		if (todo) entries.push({ line_no, todo });
	});
	return entries;
}

/** Parse a single line; null if it is not a task line (`- [ ] …`). */
export function parse_todo(line: string, options: ParseOptions): Todo | null {
	const match = TASK.exec(line);
	if (!match) return null;
	const status = match[1] ?? ' ';
	const text = match[2] ?? '';
	const r = new FieldReader(field_map(line));

	const kinds = KIND_FIELDS.filter(([, key]) => r.has(key)).map(([kind]) => kind);
	if (kinds.length > 1) r.errors.push({ code: 'conflicting_kinds' });
	const kind = kinds.length === 1 ? (kinds[0] ?? 'none') : 'none';
	const timing = read_timing(kind, r) ?? { kind: 'none' };

	const plain = strip_fields(text);
	const note = wiki_link_target(plain);
	const title = plain.replace(/\[\[[^\]]*\]\]/, '').replace(/\s+/g, ' ').trim();
	const log_field = find_field(line, FIELD.log);

	return {
		raw: line,
		status,
		done: status !== ' ',
		title,
		note,
		log: log_field ? wiki_link_target(log_field.value) : null,
		importance: r.optional(FIELD.importance, parse_importance) ?? options.default_importance,
		paused_until: r.optional(FIELD.paused_until, parse_date),
		done_on: r.optional(FIELD.done, parse_date),
		timing,
		errors: r.errors,
	};
}
