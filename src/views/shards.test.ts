import { describe, expect, it } from 'vitest';
import { shard_pieces } from './shards';

describe('shard_pieces', () => {
	const shards = shard_pieces(200, 60, 4, 2, () => 0.5);

	it('covers the rectangle with a grid', () => {
		expect(shards).toHaveLength(8);
		expect(shards[0]).toMatchObject({ x: 0, y: 0, w: 50, h: 30 });
		expect(shards[7]).toMatchObject({ x: 150, y: 30 });
	});

	it('moves pieces away from the center', () => {
		expect(shards[0]?.dx).toBeLessThan(0);
		expect(shards[3]?.dx).toBeGreaterThan(0);
		expect(shards[0]!.dy).toBeLessThan(shards[4]!.dy);
	});
});
