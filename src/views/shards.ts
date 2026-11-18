/** One piece of a shattered rectangle, in px relative to its top left corner. */
export interface Shard {
	x: number;
	y: number;
	w: number;
	h: number;
	/** Flight offset (px) and rotation (deg) at the end of the animation. */
	dx: number;
	dy: number;
	rot: number;
}

/** Cut a `width` × `height` rectangle into a grid and let each piece fly away from the center. */
export function shard_pieces(
	width: number,
	height: number,
	cols: number,
	rows: number,
	random: () => number = Math.random,
): Shard[] {
	const w = width / cols;
	const h = height / rows;
	const shards: Shard[] = [];
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const x = c * w;
			const y = r * h;
			// Direction from the center to the piece center, plus some jitter.
			const vx = (x + w / 2 - width / 2) / (width / 2) + (random() - 0.5) * 0.6;
			const vy = (y + h / 2 - height / 2) / (height / 2) + (random() - 0.5) * 0.6;
			const dist_px = 30 + random() * 40;
			shards.push({
				x,
				y,
				w,
				h,
				dx: vx * dist_px,
				dy: vy * dist_px + 20,
				rot: (random() - 0.5) * 120,
			});
		}
	}
	return shards;
}
