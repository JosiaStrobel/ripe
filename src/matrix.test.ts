import { describe, expect, it } from 'vitest';
import {
	days_to_critical,
	lane_count,
	matrix_start,
	place_blocks,
	snap_start,
	time_position,
} from './matrix';

describe('days_to_critical', () => {
	it('counts days until critical, 0 when overdue, null without window', () => {
		expect(days_to_critical({ start: 0, critical: 10 }, 4)).toBe(6);
		expect(days_to_critical({ start: 0, critical: 10 }, 12)).toBe(0);
		expect(days_to_critical(null, 4)).toBeNull();
	});
});

describe('time_position', () => {
	it('keeps equal steps for the near days and compresses the far days', () => {
		expect(time_position(0, 14)).toBe(0);
		expect(time_position(7, 14)).toBeCloseTo(0.6);
		expect(time_position(14, 14)).toBe(1);
		const step = (d: number): number => time_position(d + 1, 14) - time_position(d, 14);
		expect(step(0)).toBeCloseTo(step(5)); // first step not larger than the others
		expect(step(10)).toBeLessThan(step(0));
	});

	it('puts far and timeless tasks at the right edge', () => {
		expect(time_position(30, 14)).toBe(1);
		expect(time_position(null, 14)).toBe(1);
	});
});

describe('matrix_start', () => {
	it('maps the axis position to the free track width', () => {
		expect(matrix_start(0, 0.2)).toBe(0);
		expect(matrix_start(1, 0.2)).toBeCloseTo(0.8);
		expect(matrix_start(0.5, 0.2)).toBeCloseTo(0.4);
	});

	it('clamps positions and oversized blocks', () => {
		expect(matrix_start(1.5, 0.2)).toBeCloseTo(0.8);
		expect(matrix_start(-1, 0.2)).toBe(0);
		expect(matrix_start(1, 1.5)).toBe(0);
	});
});

describe('snap_start', () => {
	it('snaps to the nearest fifth of the block width', () => {
		// width 0.2 → step 0.04
		expect(snap_start(0.05, 0.2)).toBeCloseTo(0.04);
		expect(snap_start(0.07, 0.2)).toBeCloseTo(0.08);
		expect(snap_start(0, 0.2)).toBe(0);
	});

	it('stays within the track', () => {
		expect(snap_start(0.8, 0.2)).toBeCloseTo(0.8);
		expect(snap_start(0.79, 0.3)).toBeCloseTo(0.66); // last place: 11 steps of 0.06
	});

});

describe('place_blocks', () => {
	// width 0.2 → raster step 0.04, max shift 0.2 / 3 ≈ 0.067
	const place = (ideals: number[]): string =>
		place_blocks(ideals, 0.2)
			.map((p) => `${p.start.toFixed(2)}@${p.lane}`)
			.join(' ');

	it('snaps free blocks to their nearest place', () => {
		expect(place([0.05, 0.51])).toBe('0.04@0 0.52@0');
	});

	it('shifts a block up to a third of its width to stay in the lane', () => {
		// second block ideal 0.57 → nearest 0.56 is blocked (needs >= 0.60); 0.60 is 0.03 away
		expect(place([0.4, 0.57])).toBe('0.40@0 0.60@0');
	});

	it('opens a new lane if the shift would be larger', () => {
		// 0.44 would need 0.60 (0.16 away > 0.067)
		expect(place([0.4, 0.44])).toBe('0.40@0 0.44@1');
	});

	it('reuses upper lanes when a place fits there', () => {
		expect(place([0.4, 0.44, 0.62])).toBe('0.40@0 0.44@1 0.60@0');
	});

	it('keeps blocks inside the track', () => {
		expect(place([0.8, 0.8])).toBe('0.80@0 0.80@1');
	});
});

describe('lane_count', () => {
	it('counts lanes, at least one', () => {
		expect(lane_count([0, 2, 1])).toBe(3);
		expect(lane_count([])).toBe(1);
	});
});
