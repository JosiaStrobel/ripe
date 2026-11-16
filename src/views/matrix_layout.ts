import { Platform } from 'obsidian';
import { t, type MessageKey } from '../i18n';
import { days_to_critical, lane_count, matrix_start, place_blocks, time_position } from '../matrix';
import type { Day } from '../parser/date';
import type { TaskActions } from './task_actions';
import { render_task_block, type TaskRow } from './task_block';

/** Block width in the matrix (px); must match the CSS variable set below. */
const BLOCK_WIDTH_PX = Platform.isPhone ? 110 : 150;
/** Fallback track width if the view is not laid out yet (px). */
const FALLBACK_TRACK_PX = 600;

/** Importance rows from top to bottom with their labels. */
const IMPORTANCE_ROWS: ReadonlyArray<[number, MessageKey]> = [
	[3, 'settings.importance.high'],
	[2, 'settings.importance.normal'],
	[1, 'settings.importance.low'],
];

/** Time axis of the matrix. */
export interface MatrixOptions {
	today: Day;
	/** Days until critical shown on the axis; further tasks sit at the right edge. */
	range_days: number;
}

/**
 * Urgency/importance matrix: one row per importance, blocks placed horizontally by days
 * until critical (left = urgent); overlapping blocks move into further lanes of the row.
 */
export function render_matrix_layout(
	el: HTMLElement,
	rows: readonly TaskRow[],
	actions: TaskActions,
	options: MatrixOptions,
): void {
	const matrix = el.createDiv({ cls: 'ripe-matrix' });
	matrix.setCssProps({ '--ripe-matrix-block-width': `${BLOCK_WIDTH_PX}px` });
	const axis = matrix.createDiv({ cls: 'ripe-matrix-axis' });
	axis.createSpan({ text: t('matrix.urgent') });
	axis.createSpan({ text: t('matrix.not_urgent', { days: options.range_days }) });

	for (const [importance, label] of IMPORTANCE_ROWS) {
		const row_el = matrix.createDiv({ cls: 'ripe-matrix-row' });
		row_el.createDiv({ cls: 'ripe-matrix-label', text: t(label) });
		const track = row_el.createDiv({ cls: 'ripe-matrix-track' });
		const items = rows.filter((row) => row.entry.todo.importance === importance);
		const width = BLOCK_WIDTH_PX / (track.clientWidth || FALLBACK_TRACK_PX);
		const ideals = items.map((row) => {
			const days = days_to_critical(row.urgency.window, options.today);
			return matrix_start(time_position(days, options.range_days), width);
		});
		const placements = place_blocks(ideals, width);
		track.setCssProps({ '--ripe-lanes': String(lane_count(placements.map((p) => p.lane))) });
		items.forEach((row, i) => {
			const block = render_task_block(track, row, actions);
			block.addClass('ripe-matrix-block');
			block.setCssProps({
				'--ripe-x': `${(placements[i]?.start ?? 0) * 100}%`,
				'--ripe-lane': String(placements[i]?.lane ?? 0),
			});
		});
	}
}
