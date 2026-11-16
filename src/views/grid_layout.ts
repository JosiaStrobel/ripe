import { group_by_level } from '../grouping';
import { t } from '../i18n';
import { urgency_level } from '../urgency';
import type { TaskActions } from './task_actions';
import { render_task_block, type TaskRow } from './task_block';

/** Collapsible section of hidden tasks below the grid. */
export interface HiddenSection {
	rows: readonly TaskRow[];
	open: boolean;
	on_toggle: (open: boolean) => void;
}

/** Color grid: one grid per color level, so each color starts on a new row. */
export function render_grid_layout(
	el: HTMLElement,
	rows: readonly TaskRow[],
	actions: TaskActions,
	hidden: HiddenSection,
): void {
	const groups = el.createDiv({ cls: 'ripe-groups' });
	for (const group of group_by_level(rows, (row) => urgency_level(row.urgency))) {
		const grid = groups.createDiv({ cls: 'ripe-grid' });
		for (const row of group.items) render_task_block(grid, row, actions);
	}
	if (hidden.rows.length > 0) render_hidden_section(groups, hidden, actions);
}

/** "Hidden (N)": collapsed by default, tasks sorted by the day they appear. */
function render_hidden_section(parent: HTMLElement, hidden: HiddenSection, actions: TaskActions): void {
	const details = parent.createEl('details', { cls: 'ripe-hidden-section' });
	details.open = hidden.open;
	details.createEl('summary', { text: t('view.hidden', { count: hidden.rows.length }) });
	details.addEventListener('toggle', () => hidden.on_toggle(details.open));
	const grid = details.createDiv({ cls: 'ripe-grid' });
	for (const row of hidden.rows) render_task_block(grid, row, actions);
}
