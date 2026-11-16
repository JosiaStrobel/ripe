import { format_date, type Day } from './parser/date';
import { set_field } from './parser/fields';
import { FIELD, type Todo } from './parser/todo';

/**
 * Pure line transformations for task actions. Each returns the new line text;
 * only the affected fields or the checkbox change.
 */

/** True for recurring tasks (completion updates `zuletzt` instead of the checkbox). */
export function is_recurring(todo: Todo): boolean {
	return todo.timing.kind === 'interval' || todo.timing.kind === 'calendar';
}

/** Set the checkbox status character of a task line. */
export function set_status(line: string, status: string): string {
	return line.replace(/^(\s*[-*+]\s+\[).(\])/, `$1${status}$2`);
}

/** Mark a task done: recurring → `zuletzt` = today; one-time → `[x]` + `erledigt`. */
export function complete_line(todo: Todo, today: Day): string {
	const date = format_date(today);
	if (is_recurring(todo)) return set_field(todo.raw, FIELD.last_done, date);
	return set_field(set_status(todo.raw, 'x'), FIELD.done, date);
}

/** Skip a recurring task: same line change as completing (the log will tell them apart). */
export function skip_line(todo: Todo, today: Day): string {
	return set_field(todo.raw, FIELD.last_done, format_date(today));
}

/**
 * Replace one line in a file's content, but only if it still has the expected text.
 * Falls back to a unique line with that text if lines moved. Returns null if the
 * line cannot be found unambiguously, so user edits are never overwritten.
 */
export function replace_line(
	content: string,
	line_no: number,
	expected: string,
	replacement: string,
): string | null {
	const lines = content.split('\n');
	const text = (i: number): string => (lines[i] ?? '').replace(/\r$/, '');
	let index = text(line_no) === expected && line_no < lines.length ? line_no : -1;
	if (index === -1) {
		const matches = lines.map((_, i) => i).filter((i) => text(i) === expected);
		if (matches.length !== 1) return null;
		index = matches[0] ?? -1;
	}
	const ending = (lines[index] ?? '').endsWith('\r') ? '\r' : '';
	lines[index] = replacement + ending;
	return lines.join('\n');
}
