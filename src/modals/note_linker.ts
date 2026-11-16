import { type App, type FuzzyMatch, FuzzySuggestModal, normalizePath, Notice, type TFile } from 'obsidian';
import { t } from '../i18n';
import { moc_tree_api } from '../integrations/moc_tree';
import { note_label, note_name, remove_note_link, set_note_link, unique_name } from '../notes';
import type { TodoEntry } from '../parser/todo';
import type { PluginSettings } from '../settings';
import type { TodoStore } from '../store';

/** Creates, links and unlinks the detail note of a task. */
export class NoteLinker {
	/** Create the linker for a store; settings are read on every use. */
	constructor(
		private readonly app: App,
		private readonly store: TodoStore,
		private readonly get_settings: () => PluginSettings,
	) {}

	/** Create a note for the task (never overwrites), link it and open it. */
	async create(entry: TodoEntry): Promise<void> {
		const title = entry.todo.title.trim();
		if (!title) {
			new Notice(t('notice.no_title'));
			return;
		}
		try {
			const file = await this.create_file(title);
			if (file && (await this.link_file(entry, file))) {
				await this.app.workspace.openLinkText(file.path, this.store.path);
			}
		} catch (error) {
			console.error('Ripe: failed to create note', error);
			new Notice(t('notice.write_failed'));
		}
	}

	/** Pick an existing note and link it (replaces a previous note link). */
	link(entry: TodoEntry): void {
		new NoteSuggestModal(this.app, this.store.path, (file) => void this.link_file(entry, file)).open();
	}

	/** Remove the note link from the task; the note itself stays. */
	async unlink(entry: TodoEntry): Promise<void> {
		await this.update(entry, remove_note_link(entry.todo.raw));
	}

	/** Create the note file via MOC Tree if chosen and available, else by Ripe; null = cancelled. */
	private async create_file(title: string): Promise<TFile | null> {
		const creator = this.get_settings().noteCreator;
		const moc_tree = creator === 'ripe' ? null : moc_tree_api(this.app);
		if (moc_tree) return moc_tree.create_note(title, { interactive: creator === 'moc_tree_dialog' });
		return this.create_own_file(title);
	}

	/** Ripe's own note: task title as name, where Obsidian puts new notes. */
	private async create_own_file(title: string): Promise<TFile | null> {
		const name = note_name(title);
		if (!name) {
			new Notice(t('notice.no_title'));
			return null;
		}
		const parent = this.app.fileManager.getNewFileParent(this.store.path, `${name}.md`);
		const dir = parent.isRoot() ? '' : `${parent.path}/`;
		const path_of = (candidate: string): string => normalizePath(`${dir}${candidate}.md`);
		const free = unique_name(name, (n) => this.app.vault.getAbstractFileByPath(path_of(n)) !== null);
		return this.app.vault.create(path_of(free), '');
	}

	/** Write the link to `file` into the task line. */
	private async link_file(entry: TodoEntry, file: TFile): Promise<boolean> {
		const link = this.app.metadataCache.fileToLinktext(file, this.store.path, true);
		return this.update(entry, set_note_link(entry.todo.raw, link));
	}

	/** Replace the task line; reports a changed line or write errors. */
	private async update(entry: TodoEntry, line: string): Promise<boolean> {
		try {
			if (await this.store.update_line(entry, line)) return true;
			new Notice(t('notice.line_changed'));
		} catch (error) {
			console.error('Ripe: failed to update todo line', error);
			new Notice(t('notice.write_failed'));
		}
		return false;
	}
}

/** Fuzzy search over all notes except the todo file; finds frontmatter title and aliases. */
class NoteSuggestModal extends FuzzySuggestModal<TFile> {
	/** Create the search; `on_choose` receives the picked note. */
	constructor(
		app: App,
		private readonly todo_path: string,
		private readonly on_choose: (file: TFile) => void,
	) {
		super(app);
		this.setPlaceholder(t('modal.link_placeholder'));
	}

	getItems(): TFile[] {
		return this.app.vault.getMarkdownFiles().filter((file) => file.path !== this.todo_path);
	}

	getItemText(file: TFile): string {
		const { title, aliases } = this.label(file);
		return [title, ...aliases, file.path.replace(/\.md$/, '')].filter((s) => s).join(' · ');
	}

	renderSuggestion(match: FuzzyMatch<TFile>, el: HTMLElement): void {
		const file = match.item;
		const { title, aliases } = this.label(file);
		el.addClass('ripe-note-suggestion');
		el.createDiv({ text: title ?? file.basename });
		const details = [...aliases, file.path.replace(/\.md$/, '')].join(' · ');
		el.createDiv({ cls: 'ripe-note-suggestion-path', text: details });
	}

	onChooseItem(file: TFile): void {
		this.on_choose(file);
	}

	/** Frontmatter title and aliases of a note. */
	private label(file: TFile): ReturnType<typeof note_label> {
		return note_label(this.app.metadataCache.getFileCache(file)?.frontmatter);
	}
}
