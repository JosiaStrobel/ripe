import { ItemView, Menu, Notice, setIcon, type WorkspaceLeaf } from 'obsidian';
import { complete_line, is_recurring, skip_line } from '../actions';
import { t } from '../i18n';
import { today } from '../parser/date';
import type { TodoEntry, TodoError } from '../parser/todo';
import type { TaskEditor } from '../modals/task_editor';
import type { TodoStore } from '../store';
import {
	compare_urgency,
	compute_urgency,
	urgency_level,
	type Urgency,
	type UrgencyOptions,
} from '../urgency';

export const OVERVIEW_VIEW_TYPE = 'ripe-overview';

/** A visible task with its urgency. */
interface Row {
	entry: TodoEntry;
	urgency: Urgency;
}

/** Overview of all visible tasks as colored blocks, most urgent first. */
export class OverviewView extends ItemView {
	/** Incremented per render, so a slower older render does not overwrite a newer one. */
	private render_id = 0;

	/** Create the view for a leaf. */
	constructor(
		leaf: WorkspaceLeaf,
		private readonly store: TodoStore,
		private readonly editor: TaskEditor,
		private readonly get_urgency_options: () => UrgencyOptions,
	) {
		super(leaf);
		this.addAction('plus', t('command.add_task'), () => this.editor.add());
		this.addAction('zap', t('command.quick_add'), () => this.editor.quick());
	}

	getViewType(): string {
		return OVERVIEW_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t('view.title');
	}

	getIcon(): string {
		return 'apple';
	}

	async onOpen(): Promise<void> {
		this.contentEl.addClass('ripe-overview');
		await this.render();
	}

	/** Reload the todo file and rebuild the view. */
	async render(): Promise<void> {
		const id = ++this.render_id;
		const entries = await this.store.load();
		if (id !== this.render_id) return;
		const el = this.contentEl;
		el.empty();
		if (!entries) {
			this.render_missing_file(el);
			return;
		}
		const day = today();
		const options = this.get_urgency_options();
		const rows: Row[] = entries
			.map((entry) => ({ entry, urgency: compute_urgency(entry.todo, day, options) }))
			.filter((row) => row.urgency.visible)
			.sort(
				(a, b) =>
					compare_urgency(a.urgency, b.urgency) || b.entry.todo.importance - a.entry.todo.importance,
			);
		if (rows.length === 0) {
			el.createDiv({ cls: 'ripe-empty', text: t('view.empty') });
			return;
		}
		const grid = el.createDiv({ cls: 'ripe-grid' });
		for (const row of rows) this.render_block(grid, row);
	}

	/** Hint and create button when the todo file does not exist. */
	private render_missing_file(el: HTMLElement): void {
		const box = el.createDiv({ cls: 'ripe-empty' });
		box.createDiv({ text: t('view.missing_file', { path: this.store.path }) });
		const button = box.createEl('button', { cls: 'mod-cta', text: t('view.create_file') });
		button.addEventListener('click', () => void this.create_file());
	}

	/** Create the missing todo file and redraw. */
	private async create_file(): Promise<void> {
		await this.store.create_file();
		await this.render();
	}

	/** One colored task block. */
	private render_block(grid: HTMLElement, row: Row): void {
		const { todo } = row.entry;
		const level = urgency_level(row.urgency);
		const block = grid.createDiv({
			cls: ['ripe-block', level === null ? 'ripe-level-none' : `ripe-level-${level}`],
		});
		if (todo.importance === 3) block.addClass('ripe-important');
		if (todo.errors.length > 0) block.addClass('ripe-invalid');

		const body = block.createDiv({ cls: 'ripe-block-body' });
		body.createDiv({ cls: 'ripe-block-title', text: todo.title || t('view.untitled') });
		const meta = body.createDiv({ cls: 'ripe-block-meta' });
		if (row.urgency.overdue_days > 0) {
			meta.createSpan({ cls: 'ripe-overdue', text: t('view.overdue', { days: row.urgency.overdue_days }) });
		}
		if (todo.note) setIcon(meta.createSpan({ cls: 'ripe-note-icon' }), 'file-text');
		for (const error of todo.errors) meta.createDiv({ cls: 'ripe-error', text: error_text(error) });

		const done = block.createEl('button', {
			cls: 'ripe-done clickable-icon',
			attr: { 'aria-label': t('action.done') },
		});
		setIcon(done, 'check');
		done.addEventListener('click', (evt) => {
			evt.stopPropagation();
			void this.apply(row.entry, complete_line(todo, today()));
		});

		// "click" fires only for the primary button and taps; right click and long press
		// go to "contextmenu" (Obsidian's onClickEvent would also react to auxclick).
		block.addEventListener('click', (evt) => {
			if (todo.note) void this.open_note(todo.note);
			else this.show_menu(row.entry, evt);
		});
		block.addEventListener('contextmenu', (evt) => {
			evt.preventDefault();
			this.show_menu(row.entry, evt);
		});
	}

	/** Action menu for a task (tap without note, long press, right click). */
	private show_menu(entry: TodoEntry, evt: MouseEvent): void {
		const { todo } = entry;
		const menu = new Menu();
		menu.addItem((item) =>
			item
				.setTitle(t('action.done'))
				.setIcon('check')
				.onClick(() => this.apply(entry, complete_line(todo, today()))),
		);
		if (is_recurring(todo)) {
			menu.addItem((item) =>
				item
					.setTitle(t('action.skip'))
					.setIcon('skip-forward')
					.onClick(() => this.apply(entry, skip_line(todo, today()))),
			);
		}
		menu.addItem((item) =>
			item
				.setTitle(t('action.edit'))
				.setIcon('pencil')
				.onClick(() => this.editor.edit(entry)),
		);
		const note = todo.note;
		if (note) {
			menu.addItem((item) =>
				item
					.setTitle(t('action.open_note'))
					.setIcon('file-text')
					.onClick(() => this.open_note(note)),
			);
		}
		menu.addItem((item) =>
			item
				.setTitle(t('action.show_line'))
				.setIcon('list')
				.onClick(() => this.show_line(entry.line_no)),
		);
		menu.showAtMouseEvent(evt);
	}

	/** Write a changed task line and redraw. */
	private async apply(entry: TodoEntry, replacement: string): Promise<void> {
		try {
			if (!(await this.store.update_line(entry, replacement))) new Notice(t('notice.line_changed'));
		} catch (error) {
			console.error('Ripe: failed to update todo line', error);
			new Notice(t('notice.write_failed'));
		}
		await this.render();
	}

	/** Open a linked note relative to the todo file. */
	private async open_note(link: string): Promise<void> {
		await this.app.workspace.openLinkText(link, this.store.path);
	}

	/** Open the todo file at a line. */
	private async show_line(line_no: number): Promise<void> {
		const file = this.store.file;
		if (!file) return;
		await this.app.workspace.getLeaf(false).openFile(file, { eState: { line: line_no } });
	}
}

/** UI text for a parse error. */
function error_text(error: TodoError): string {
	return t(`error.${error.code}`, { field: error.field ?? '' });
}
