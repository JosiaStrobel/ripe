import { ORDER_KEY, type ShoppingCategory } from './parser';

/**
 * Category order (store order) from the frontmatter key `reihenfolge`.
 * Only the order list changes when sorting; the headings stay where they are in the file.
 */

/** Order list from parsed frontmatter; null if missing or not a list of names. */
export function read_order(frontmatter: unknown): string[] | null {
	if (typeof frontmatter !== 'object' || frontmatter === null) return null;
	const value = (frontmatter as Record<string, unknown>)[ORDER_KEY];
	if (!Array.isArray(value)) return null;
	return value.filter((v): v is string | number => typeof v === 'string' || typeof v === 'number').map(String);
}

/**
 * Sort categories by the order list: items without a category stay on top, listed
 * categories follow in list order, all others keep their file order at the end.
 */
export function order_categories(categories: readonly ShoppingCategory[], order: readonly string[] | null): ShoppingCategory[] {
	const rank = (c: ShoppingCategory): number => {
		if (c.line_no === null) return -1;
		const index = order?.indexOf(c.name) ?? -1;
		return index === -1 ? Number.MAX_SAFE_INTEGER : index;
	};
	// Array.prototype.sort is stable, so equal ranks keep their file order.
	return [...categories].sort((a, b) => rank(a) - rank(b));
}

/** New order list after moving `name` one place up (-1) or down (+1); null at the ends. */
export function move_in_order(names: readonly string[], name: string, direction: -1 | 1): string[] | null {
	const index = names.indexOf(name);
	const other = index + direction;
	if (index === -1 || other < 0 || other >= names.length) return null;
	const result = [...names];
	result[index] = names[other] ?? name;
	result[other] = name;
	return result;
}
