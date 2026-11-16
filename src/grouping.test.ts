import { describe, expect, it } from 'vitest';
import { group_by_level } from './grouping';

describe('group_by_level', () => {
	it('groups by level, highest first, null last, keeping item order', () => {
		const items = [
			{ name: 'a', level: 1 },
			{ name: 'b', level: null },
			{ name: 'c', level: 3 },
			{ name: 'd', level: 1 },
			{ name: 'e', level: 3 },
			{ name: 'f', level: 0 },
		];
		const groups = group_by_level(items, (item) => item.level);
		expect(groups.map((g) => [g.level, g.items.map((i) => i.name).join('')])).toEqual([
			[3, 'ce'],
			[1, 'ad'],
			[0, 'f'],
			[null, 'b'],
		]);
	});

	it('returns no groups for no items', () => {
		expect(group_by_level([], () => 0)).toEqual([]);
	});
});
