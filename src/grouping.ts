/** A group of items sharing one color level (null = no urgency window). */
export interface LevelGroup<T> {
	level: number | null;
	items: T[];
}

/**
 * Group items by color level, most urgent level first, items without level last.
 * Keeps the order of items within a group, so pre-sorted input stays sorted.
 */
export function group_by_level<T>(items: readonly T[], level_of: (item: T) => number | null): LevelGroup<T>[] {
	const groups = new Map<number | null, T[]>();
	for (const item of items) {
		const level = level_of(item);
		const group = groups.get(level);
		if (group) group.push(item);
		else groups.set(level, [item]);
	}
	return [...groups.entries()]
		.map(([level, grouped]) => ({ level, items: grouped }))
		.sort((a, b) => (b.level ?? -1) - (a.level ?? -1));
}
