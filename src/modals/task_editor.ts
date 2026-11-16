import { type App, Notice } from 'obsidian';
import { apply_draft, draft_from_line, empty_draft, type TaskDraft } from '../draft';
import { t } from '../i18n';
import { today } from '../parser/date';
import type { TodoEntry } from '../parser/todo';
import type { PluginSettings } from '../settings';
import type { TodoStore } from '../store';
import { QuickModal } from './quick_modal';
import { TaskModal } from './task_modal';

/** Opens the input dialogs and writes their result to the todo file. */
export class TaskEditor {
	/** Create the editor for a store; settings are read on every use. */
	constructor(
		private readonly app: App,
		private readonly store: TodoStore,
		private readonly get_settings: () => PluginSettings,
	) {}

	/** Dialog for a new task, appended to the todo file. */
	add(): void {
		const importance = this.get_settings().defaultImportance;
		new TaskModal(this.app, {
			heading: t('modal.add_title'),
			submit_label: t('modal.add'),
			draft: empty_draft('aging', today(), importance),
			default_importance: importance,
			on_submit: (draft) => this.append(draft),
		}).open();
	}

	/** Quick capture dialog. */
	quick(): void {
		const settings = this.get_settings();
		new QuickModal(this.app, {
			fallback_duration: settings.quickDuration,
			importance: settings.defaultImportance,
			on_submit: (draft) => this.append(draft),
		}).open();
	}

	/** Dialog to edit an existing task line. */
	edit(entry: TodoEntry): void {
		const importance = this.get_settings().defaultImportance;
		const draft = draft_from_line(entry.todo.raw, importance);
		if (!draft) return;
		new TaskModal(this.app, {
			heading: t('modal.edit_title'),
			submit_label: t('modal.save'),
			draft,
			default_importance: importance,
			on_submit: async (changed) => {
				const line = apply_draft(entry.todo.raw, changed, importance);
				await this.write(async () => {
					if (!(await this.store.update_line(entry, line))) new Notice(t('notice.line_changed'));
				});
			},
		}).open();
	}

	/** Append a new task line. */
	private async append(draft: TaskDraft): Promise<void> {
		const line = apply_draft(null, draft, this.get_settings().defaultImportance);
		await this.write(() => this.store.append_line(line));
	}

	/** Run a write and report failures to the user. */
	private async write(action: () => Promise<void>): Promise<void> {
		try {
			await action();
		} catch (error) {
			console.error('Ripe: failed to write todo file', error);
			new Notice(t('notice.write_failed'));
		}
	}
}
