import { set_field } from '../parser/fields';
import type { LineChange } from '../line_changes';
import { body_start, parse_shopping, SHOPPING_FIELD, type ItemState, type ShoppingCategory, type ShoppingItem } from './parser';

/** Pure transformations of the shopping file; only the affected lines change. */

const ITEM_PREFIX = /^([-*+]\s+)(?:\[.\]\s?)?/;
const CHECKBOX: Readonly<Record<ItemState, string>> = { catalog: '', listed: '[ ] ', checked: '[x] ' };

/** Rewrite the list marker of an item line for the given state. */
export function set_item_state(line: string, state: ItemState): string {
	return line.replace(ITEM_PREFIX, (_, bullet: string) => `${bullet}${CHECKBOX[state]}`);
}

/** Change of one item to a new state (null if nothing changes). */
export function state_change(item: ShoppingItem, state: ItemState): LineChange | null {
	const after = set_item_state(item.raw, state);
	return after === item.raw ? null : { line_no: item.line_no, before: item.raw, after };
}

/** "Shopping done": checked items go back to the catalog and their count goes up by one. */
export function finish_changes(categories: readonly ShoppingCategory[]): LineChange[] {
	return categories
		.flatMap((c) => c.items)
		.filter((item) => item.state === 'checked')
		.map((item) => ({
			line_no: item.line_no,
			before: item.raw,
			after: set_field(set_item_state(item.raw, 'catalog'), SHOPPING_FIELD.bought, String(item.bought + 1)),
		}));
}

/** Item with this name (case-insensitive, trimmed), or undefined. */
export function find_item(categories: readonly ShoppingCategory[], name: string): ShoppingItem | undefined {
	const wanted = name.trim().toLowerCase();
	return categories.flatMap((c) => c.items).find((item) => item.name.toLowerCase() === wanted);
}

/** New item line on the current list. */
export function new_item_line(name: string): string {
	return `- [ ] ${name.replace(/\s+/g, ' ').trim()}`;
}

/**
 * Insert an item line at the end of a category (by name). A missing category is
 * appended as a new `##` heading at the end of the file; category "" means above the first heading.
 */
export function insert_item(content: string, category: string, line: string): string {
	const newline = content.includes('\r\n') ? '\r\n' : '\n';
	const lines = content.split('\n');
	const target = parse_shopping(content).find((c) => c.name === category);
	const after = target?.items[target.items.length - 1]?.line_no ?? target?.line_no;
	if (after !== undefined && after !== null) {
		const ending = (lines[after] ?? '').endsWith('\r') ? '\r' : '';
		lines.splice(after + 1, 0, line + ending);
		return lines.join('\n');
	}
	if (!category) {
		// Items without a category belong above the first heading.
		const start = body_start(lines.map((l) => l.replace(/\r$/, '')));
		lines.splice(start, 0, line + (newline === '\r\n' ? '\r' : ''));
		return lines.join('\n');
	}
	const block = [`## ${category}`, line];
	const trimmed = content.replace(/(\r?\n)+$/, '');
	const separator = trimmed.length === 0 ? '' : `${newline}${newline}`;
	return `${trimmed}${separator}${block.join(newline)}${newline}`;
}
