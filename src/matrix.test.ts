import { describe, expect, it } from 'vitest';
import { assign_lanes, days_to_critical, lane_count, matrix_start, time_position } from './matrix';

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

describe('assign_lanes', () => {
	it('keeps non-overlapping blocks in one lane', () => {
		expect(assign_lanes([0, 0.3, 0.6], 0.25)).toEqual([0, 0, 0]);
	});

	it('moves overlapping blocks into further lanes, in input order', () => {
		// 0.8 and 0.8 collide, 0.1 is free
		expect(assign_lanes([0.8, 0.1, 0.8, 0.7], 0.2)).toEqual([1, 0, 2, 0]);
	});

	it('reuses a lane once it is free again', () => {
		expect(assign_lanes([0, 0.1, 0.25], 0.2)).toEqual([0, 1, 0]);
	});

	it('counts lanes, at least one', () => {
		expect(lane_count([0, 2, 1])).toBe(3);
		expect(lane_count([])).toBe(1);
	});
});
