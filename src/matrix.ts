import type { Day } from './parser/date';
import type { UrgencyWindow } from './urgency';

/**
 * Layout math for the urgency/importance matrix. The horizontal axis is absolute time:
 * days until the critical day, urgent on the left (as in the classic Eisenhower matrix),
 * so one day has the same width for every task. Overlapping blocks within one importance
 * row move into extra lanes. Positions are fractions of the track width (0 = left).
 */

/**
 * Axis compression with a knee: the first KNEE_FRACTION of the range is linear and gets
 * NEAR_SHARE of the width, the rest is linear but compressed. Unlike a root curve, the
 * first day step is not larger than the following ones.
 */
export const KNEE_FRACTION = 0.5;
export const NEAR_SHARE = 0.6;

/** Days until the critical day (0 if critical or overdue); null without window. */
export function days_to_critical(window: UrgencyWindow | null, today: Day): number | null {
	return window ? Math.max(0, window.critical - today) : null;
}

/**
 * Axis position 0 … 1 for `days` until critical within `range_days` (compressed with a
 * knee, see above); beyond the range and without window (null) at the right edge.
 */
export function time_position(days: number | null, range_days: number): number {
	if (days === null || range_days <= 0) return 1;
	const d = Math.min(Math.max(days, 0), range_days);
	const knee = range_days * KNEE_FRACTION;
	if (d <= knee) return (d / knee) * NEAR_SHARE;
	return NEAR_SHARE + ((d - knee) / (range_days - knee)) * (1 - NEAR_SHARE);
}

/** Left edge (0 … 1 − width) of a block of relative `width` at axis `position` (0 … 1). */
export function matrix_start(position: number, width: number): number {
	const clamped = Math.min(Math.max(position, 0), 1);
	return clamped * Math.max(1 - width, 0);
}

/**
 * Lane per block so that blocks of relative `width` never overlap within a lane.
 * Greedy from left to right: each block takes the first lane that is free at its start.
 * Returns the lanes in input order.
 */
export function assign_lanes(starts: readonly number[], width: number): number[] {
	const EPSILON = 1e-9;
	const order = starts.map((start, index) => ({ start, index })).sort((a, b) => a.start - b.start);
	const lane_ends: number[] = [];
	const lanes = new Array<number>(starts.length).fill(0);
	for (const { start, index } of order) {
		let lane = lane_ends.findIndex((end) => end <= start + EPSILON);
		if (lane === -1) lane = lane_ends.length;
		lane_ends[lane] = start + width;
		lanes[index] = lane;
	}
	return lanes;
}

/** Number of lanes used (at least 1, so empty rows keep their height). */
export function lane_count(lanes: readonly number[]): number {
	return Math.max(1, ...lanes.map((lane) => lane + 1));
}
