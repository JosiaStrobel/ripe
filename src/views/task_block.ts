import { setIcon } from 'obsidian';
import { t } from '../i18n';
import type { TodoEntry, TodoError } from '../parser/todo';
import { urgency_level, type HiddenInfo, type Urgency } from '../urgency';
import { short_date } from './format';
import { attach_tap_hold } from './hold_gesture';
import { shatter } from './shatter';
import type { TaskActions } from './task_actions';

/** A task with its urgency; `hidden` is set for tasks that are not visible yet. */
export interface TaskRow {
	entry: TodoEntry;
	urgency: Urgency;
	hidden?: HiddenInfo;
}

/** Render one colored task block into `parent`; used by all overview layouts. */
export function render_task_block(parent: HTMLElement, row: TaskRow, actions: TaskActions): HTMLElement {
	const { todo } = row.entry;
	const level = urgency_level(row.urgency);
	const level_cls = level === null || row.hidden ? 'ripe-level-none' : `ripe-level-${level}`;
	const block = parent.createDiv({ cls: ['ripe-block', level_cls] });
	if (row.hidden) block.addClass('ripe-hidden-block');
	if (todo.importance === 3) block.addClass('ripe-important');
	if (todo.errors.length > 0) block.addClass('ripe-invalid');

	const body = block.createDiv({ cls: 'ripe-block-body' });
	body.createDiv({ cls: 'ripe-block-title', text: todo.title || t('view.untitled') });
	const meta = body.createDiv({ cls: 'ripe-block-meta' });
	if (row.hidden) {
		const key = row.hidden.paused ? 'view.paused_until' : 'view.visible_from';
		meta.createSpan({ text: t(key, { date: short_date(row.hidden.until) }) });
	}
	if (row.urgency.overdue_days > 0) {
		meta.createSpan({ cls: 'ripe-overdue', text: t('view.overdue', { days: row.urgency.overdue_days }) });
	}
	if (todo.note) setIcon(meta.createSpan({ cls: 'ripe-note-icon' }), 'file-text');
	for (const error of todo.errors) meta.createDiv({ cls: 'ripe-error', text: error_text(error) });

	// Tap opens the menu, press and hold completes the task.
	attach_tap_hold(block, {
		tap: (evt) => actions.show_menu(row.entry, evt),
		secondary: (evt) => actions.show_menu(row.entry, evt),
		hold: () => {
			shatter(block);
			void actions.complete(row.entry);
		},
	});
	return block;
}

/** UI text for a parse error. */
function error_text(error: TodoError): string {
	return t(`error.${error.code}`, { field: error.field ?? '' });
}
