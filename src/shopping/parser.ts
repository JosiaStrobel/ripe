import { find_field, strip_fields } from '../parser/fields';

/**
 * Shopping file: headings are categories in store order, list style encodes the state
 * (see docs/konzept.md 7.3). Only top-level list items count; everything else is kept as is.
 */

/** Field keys as written in the file. */
export const SHOPPING_FIELD = { bought: 'gekauft' } as const;

/** Frontmatter key with the category order (store order). */
export const ORDER_KEY = 'reihenfolge';

/** `- Item` = catalog only, `- [ ] Item` = on the list, `- [x] Item` = checked off. */
export type ItemState = 'catalog' | 'listed' | 'checked';

/** One article line. The raw line stays the source of truth for writing. */
export interface ShoppingItem {
	raw: string;
	line_no: number;
	/** Text without fields. */
	name: string;
	state: ItemState;
	/** How often it was bought (0 if missing or invalid). */
	bought: number;
}

/** A heading with its items; items before the first heading get name "" and line_no null. */
export interface ShoppingCategory {
	name: string;
	line_no: number | null;
	items: ShoppingItem[];
}

const HEADING = /^#{1,6}\s+(.*?)\s*#*\s*$/;
const ITEM = /^[-*+]\s+(?:\[(.)\]\s?)?(.*)$/;
const FENCE = /^\s*(```|~~~)/;

/** Parse one line as an article; null for non-items, nested items and empty names. */
export function parse_item(line: string, line_no: number): ShoppingItem | null {
	const match = ITEM.exec(line);
	if (!match) return null;
	const name = strip_fields(match[2] ?? '');
	if (name.length === 0) return null;
	const status = match[1];
	const state: ItemState = status === undefined ? 'catalog' : status === ' ' ? 'listed' : 'checked';
	const bought = Number.parseInt(find_field(line, SHOPPING_FIELD.bought)?.value ?? '', 10);
	return { raw: line, line_no, name, state, bought: Number.isFinite(bought) && bought > 0 ? bought : 0 };
}

/** Index of the first line after YAML frontmatter (0 if there is none). */
export function body_start(lines: readonly string[]): number {
	if (lines[0]?.trim() !== '---') return 0;
	const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
	return end === -1 ? 0 : end + 1;
}

/** Parse a shopping file into categories in file order (empty unnamed category dropped). */
export function parse_shopping(content: string): ShoppingCategory[] {
	const lines = content.split('\n').map((line) => line.replace(/\r$/, ''));
	const categories: ShoppingCategory[] = [{ name: '', line_no: null, items: [] }];
	let in_code = false;
	for (let i = body_start(lines); i < lines.length; i++) {
		const line = lines[i] ?? '';
		if (FENCE.test(line)) in_code = !in_code;
		if (in_code) continue;
		const heading = HEADING.exec(line);
		if (heading) {
			categories.push({ name: heading[1] ?? '', line_no: i, items: [] });
			continue;
		}
		const item = parse_item(line, i);
		if (item) categories[categories.length - 1]?.items.push(item);
	}
	return categories.filter((c, i) => i > 0 || c.items.length > 0);
}
