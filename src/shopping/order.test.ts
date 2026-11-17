import { describe, expect, it } from 'vitest';
import { move_in_order, order_categories, read_order } from './order';
import { parse_shopping } from './parser';

describe('read_order', () => {
	it('reads a list of names', () => {
		expect(read_order({ reihenfolge: ['Brot', 'Obst', 7] })).toEqual(['Brot', 'Obst', '7']);
	});

	it('returns null for missing or invalid values', () => {
		expect(read_order(null)).toBeNull();
		expect(read_order({})).toBeNull();
		expect(read_order({ reihenfolge: 'Brot' })).toBeNull();
	});
});

describe('order_categories', () => {
	const categories = parse_shopping('- Brot\n## A\n- a\n## B\n## C\n## D');
	const names = (order: string[] | null): string[] => order_categories(categories, order).map((c) => c.name);

	it('keeps file order without an order list', () => {
		expect(names(null)).toEqual(['', 'A', 'B', 'C', 'D']);
	});

	it('puts listed categories first, the rest in file order', () => {
		expect(names(['C', 'A', 'Unbekannt'])).toEqual(['', 'C', 'A', 'B', 'D']);
	});
});

describe('move_in_order', () => {
	it('swaps with the neighbor', () => {
		expect(move_in_order(['A', 'B', 'C'], 'B', -1)).toEqual(['B', 'A', 'C']);
		expect(move_in_order(['A', 'B', 'C'], 'B', 1)).toEqual(['A', 'C', 'B']);
	});

	it('returns null at the ends and for unknown names', () => {
		expect(move_in_order(['A', 'B'], 'A', -1)).toBeNull();
		expect(move_in_order(['A', 'B'], 'B', 1)).toBeNull();
		expect(move_in_order(['A', 'B'], 'X', 1)).toBeNull();
	});
});
