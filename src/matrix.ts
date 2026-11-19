import type { Day } from './parser/date';
import { start_u, type UrgencyWindow } from './urgency';

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

/**
 * Days until the critical day (0 if critical or overdue); null without window.
 * A start level above 1 shortens them by its start urgency, so the block sits
 * further left to match its color (level 4 → 0).
 */
export function days_to_critical(
	window: UrgencyWindow | null,
	today: Day,
	start_level = 1,
): number | null {
	return window ? Math.max(0, window.critical - today) * (1 - start_u(start_level)) : null;
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

/** Raster steps per block width: blocks snap to multiples of width / SNAP_STEPS. */
export const SNAP_STEPS = 5;

/**
 * Snap a left edge to the nearest raster position (multiples of width / steps) that
 * still fits the track. Blocks never move further sideways; occupied places go to a lane.
 */
export function snap_start(start: number, width: number, steps: number = SNAP_STEPS): number {
	const step = width / steps;
	if (step <= 0) return 0;
	const max_index = Math.floor((1 - width) / step + 1e-9);
	const index = Math.min(Math.max(Math.round(start / step), 0), Math.max(max_index, 0));
	return index * step;
}

/** Maximum sideways shift of a block from its ideal position, as fraction of its width. */
export const MAX_SHIFT = 1 / 3;

/** Placed block: left edge (track fraction) and lane. */
export interface Placement {
	start: number;
	lane: number;
}

/**
 * Place blocks on the raster (multiples of width / steps): each block may move up to
 * `max_shift` × width from its ideal left edge to fit into an existing lane; the topmost
 * lane with a free place wins, then the place closest to the ideal. Only if no lane fits,
 * a new lane is opened at the nearest place. Blocks are placed left to right by their
 * ideal position; the result is in input order.
 */
export function place_blocks(
	ideals: readonly number[],
	width: number,
	steps: number = SNAP_STEPS,
	max_shift: number = MAX_SHIFT,
): Placement[] {
	const step = width / steps;
	if (step <= 0) return ideals.map(() => ({ start: 0, lane: 0 }));
	const max_index = Math.max(Math.floor((1 - width) / step + 1e-9), 0);
	const reach = Math.floor((max_shift * width) / step + 1e-9);
	const lanes: number[][] = []; // occupied raster indices per lane
	const result: Placement[] = ideals.map(() => ({ start: 0, lane: 0 }));
	const order = ideals.map((ideal, index) => ({ ideal, index })).sort((a, b) => a.ideal - b.ideal);

	for (const { ideal, index } of order) {
		const nearest = Math.round(snap_start(ideal, width, steps) / step);
		const candidates: number[] = [];
		for (let k = nearest - reach - 1; k <= nearest + reach + 1; k++) {
			if (k >= 0 && k <= max_index && Math.abs(k * step - ideal) <= max_shift * width + 1e-9) {
				candidates.push(k);
			}
		}
		candidates.sort((a, b) => Math.abs(a * step - ideal) - Math.abs(b * step - ideal));
		const free = (lane: number[], k: number): boolean => lane.every((other) => Math.abs(other - k) >= steps);
		let lane = lanes.findIndex((occupied) => candidates.some((k) => free(occupied, k)));
		let k = nearest;
		if (lane === -1) {
			lane = lanes.length;
			lanes.push([]);
		} else {
			k = candidates.find((c) => free(lanes[lane] ?? [], c)) ?? nearest;
		}
		lanes[lane]?.push(k);
		result[index] = { start: k * step, lane };
	}
	return result;
}

/** Number of lanes used (at least 1, so empty rows keep their height). */
export function lane_count(lanes: readonly number[]): number {
	return Math.max(1, ...lanes.map((lane) => lane + 1));
}
