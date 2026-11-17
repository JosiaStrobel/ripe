import { type App, Menu, Notice } from 'obsidian';
import { complete_line, is_recurring, pause_line, skip_line, unpause_line } from '../actions';
import { t } from '../i18n';
import type { NoteLinker } from '../modals/note_linker';
import { PauseModal } from '../modals/pause_modal';
import type { TaskEditor } from '../modals/task_editor';
import { today } from '../parser/date';
import type { TodoEntry } from '../parser/todo';
import type { TodoStore } from '../store';
import type { UndoManager } from '../undo';
import { short_date } from './format';

/** Services the task actions use. */
export interface TaskServices {
	store: TodoStore;
	editor: TaskEditor;
	notes: NoteLinker;
	undo: UndoManager;
}

/** Actions on a task block: done, skip, menu, notes; shared by all overview layouts. */
export class TaskActions {
	/** Create the actions; `on_change` redraws the view after a write. */
	constructor(
		private readonly app: App,
		private readonly services: TaskServices,
		private readonly on_change: () => Promise<void>,
	) {}

	/** Tap/click on a block: open the note if linked, else show the menu. */
	click(entry: TodoEntry, evt: MouseEvent): void {
		if (entry.todo.note) void this.open_note(entry.todo.note);
		else this.show_menu(entry, evt);
	}

	/** Mark a task done (with undo). */
	complete(entry: TodoEntry): Promise<void> {
		const message = t('notice.done', { title: entry.todo.title });
		return this.apply(entry, complete_line(entry.todo, today()), message);
	}

	/** Skip a recurring task (with undo). */
	skip(entry: TodoEntry): Promise<void> {
		const message = t('notice.skipped', { title: entry.todo.title });
		return this.apply(entry, skip_line(entry.todo, today()), message);
	}

	/** Ask for a day and pause the task until then (with undo). */
	pause(entry: TodoEntry): void {
		new PauseModal(this.app, (until) => {
			const message = t('notice.paused', { title: entry.todo.title, date: short_date(until) });
			void this.apply(entry, pause_line(entry.todo, until), message);
		}).open();
	}

	/** End the pause of a task (with undo). */
	unpause(entry: TodoEntry): Promise<void> {
		const message = t('notice.unpaused', { title: entry.todo.title });
		return this.apply(entry, unpause_line(entry.todo), message);
	}

	/** Action menu for a task (tap without note, long press, right click). */
	show_menu(entry: TodoEntry, evt: MouseEvent): void {
		const menu = new Menu();
		menu.addItem((item) =>
			item
				.setTitle(t('action.done'))
				.setIcon('check')
				.onClick(() => this.complete(entry)),
		);
		if (is_recurring(entry.todo)) {
			menu.addItem((item) =>
				item
					.setTitle(t('action.skip'))
					.setIcon('skip-forward')
					.onClick(() => this.skip(entry)),
			);
		}
		menu.addItem((item) =>
			item
				.setTitle(t('action.pause'))
				.setIcon('pause')
				.onClick(() => this.pause(entry)),
		);
		if (entry.todo.paused_until !== null) {
			menu.addItem((item) =>
				item
					.setTitle(t('action.unpause'))
					.setIcon('play')
					.onClick(() => this.unpause(entry)),
			);
		}
		menu.addItem((item) =>
			item
				.setTitle(t('action.edit'))
				.setIcon('pencil')
				.onClick(() => this.services.editor.edit(entry)),
		);
		this.add_note_items(menu, entry);
		menu.addItem((item) =>
			item
				.setTitle(t('action.show_line'))
				.setIcon('list')
				.onClick(() => this.show_line(entry.line_no)),
		);
		menu.showAtMouseEvent(evt);
	}

	/** Note actions: open/relink/unlink if a note is linked, else create/link. */
	private add_note_items(menu: Menu, entry: TodoEntry): void {
		const { notes } = this.services;
		const note = entry.todo.note;
		menu.addSeparator();
		if (note) {
			menu.addItem((item) =>
				item
					.setTitle(t('action.open_note'))
					.setIcon('file-text')
					.onClick(() => this.open_note(note)),
			);
		} else {
			menu.addItem((item) =>
				item
					.setTitle(t('action.create_note'))
					.setIcon('file-plus')
					.onClick(() => notes.create(entry)),
			);
		}
		menu.addItem((item) =>
			item
				.setTitle(t(note ? 'action.relink_note' : 'action.link_note'))
				.setIcon('link')
				.onClick(() => notes.link(entry)),
		);
		if (note) {
			menu.addItem((item) =>
				item
					.setTitle(t('action.unlink_note'))
					.setIcon('unlink')
					.onClick(() => notes.unlink(entry)),
			);
		}
		menu.addSeparator();
	}

	/** Write a changed task line, offer undo and redraw. */
	private async apply(entry: TodoEntry, replacement: string, message: string): Promise<void> {
		try {
			if (await this.services.store.update_line(entry, replacement)) {
				this.services.undo.record(
					this.services.store,
					[{ line_no: entry.line_no, before: entry.todo.raw, after: replacement }],
					message,
				);
			} else {
				new Notice(t('notice.line_changed'));
			}
		} catch (error) {
			console.error('Ripe: failed to update todo line', error);
			new Notice(t('notice.write_failed'));
		}
		await this.on_change();
	}

	/** Open a linked note relative to the todo file. */
	private async open_note(link: string): Promise<void> {
		await this.app.workspace.openLinkText(link, this.services.store.path);
	}

	/** Open the todo file at a line. */
	private async show_line(line_no: number): Promise<void> {
		const file = this.services.store.file;
		if (!file) return;
		await this.app.workspace.getLeaf(false).openFile(file, { eState: { line: line_no } });
	}
}
