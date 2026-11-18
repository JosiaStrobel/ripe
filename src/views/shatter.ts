import { shard_pieces } from './shards';

/** Duration of the shatter animation (ms); keep in sync with `.ripe-shard` in styles.css. */
const SHATTER_MS = 450;
const COLS = 4;
const ROWS = 2;

/**
 * Replace `block` by flying shards in its color. The shards live in a fixed overlay
 * on the body, so they survive the view redraw and remove themselves afterwards.
 */
export function shatter(block: HTMLElement): void {
	const rect = block.getBoundingClientRect();
	const style = getComputedStyle(block);
	const overlay = activeDocument.body.createDiv({ cls: 'ripe-shatter' });
	overlay.setCssProps({
		'--ripe-left': `${rect.left}px`,
		'--ripe-top': `${rect.top}px`,
		'--ripe-shard-bg': style.backgroundColor,
		'--ripe-shatter-ms': `${SHATTER_MS}ms`,
	});
	for (const s of shard_pieces(rect.width, rect.height, COLS, ROWS)) {
		overlay.createDiv({ cls: 'ripe-shard' }).setCssProps({
			'--ripe-x': `${s.x}px`,
			'--ripe-y': `${s.y}px`,
			'--ripe-w': `${s.w}px`,
			'--ripe-h': `${s.h}px`,
			'--ripe-dx': `${s.dx}px`,
			'--ripe-dy': `${s.dy}px`,
			'--ripe-rot': `${s.rot}deg`,
		});
	}
	block.addClass('ripe-shattered');
	window.setTimeout(() => overlay.remove(), SHATTER_MS + 50);
}
