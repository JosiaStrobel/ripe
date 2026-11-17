import type { ShoppingCategory, ShoppingItem } from './parser';

/** A category with the items to show in it. */
export interface Section {
	name: string;
	items: ShoppingItem[];
}

/** Items bought most often first, then by name. */
function by_frequency(a: ShoppingItem, b: ShoppingItem): number {
	return b.bought - a.bought || a.name.localeCompare(b.name);
}

/** Plan mode: all categories in store order, frequent items first. */
export function plan_sections(categories: readonly ShoppingCategory[]): Section[] {
	return categories.map((c) => ({ name: c.name, items: [...c.items].sort(by_frequency) }));
}

/** Shop mode: open items per category in store and file order; checked items at the very end. */
export function shop_sections(categories: readonly ShoppingCategory[]): { open: Section[]; checked: ShoppingItem[] } {
	const open = categories
		.map((c) => ({ name: c.name, items: c.items.filter((item) => item.state === 'listed') }))
		.filter((section) => section.items.length > 0);
	const checked = categories.flatMap((c) => c.items).filter((item) => item.state === 'checked');
	return { open, checked };
}
