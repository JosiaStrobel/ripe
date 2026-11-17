import { replace_line } from './actions';

/** A change of one line: `before` is expected at (or near) `line_no` and replaced by `after`. */
export interface LineChange {
	line_no: number;
	before: string;
	after: string;
}

/**
 * Apply several line changes to a file's content, all or nothing.
 * Returns null if any line cannot be found unambiguously, so user edits are never overwritten.
 */
export function apply_line_changes(content: string, changes: readonly LineChange[]): string | null {
	let result: string | null = content;
	for (const change of changes) {
		result = replace_line(result, change.line_no, change.before, change.after);
		if (result === null) return null;
	}
	return result;
}

/** Changes that revert the given ones. */
export function invert_changes(changes: readonly LineChange[]): LineChange[] {
	return changes.map((c) => ({ line_no: c.line_no, before: c.after, after: c.before }));
}
