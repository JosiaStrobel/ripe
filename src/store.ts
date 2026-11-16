import { type App, normalizePath, TFile } from 'obsidian';
import { replace_line } from './actions';
import { parse_todo_lines, type TodoEntry } from './parser/todo';
import type { PluginSettings } from './settings';

/** Reads and changes the todo file through the vault API. */
export class TodoStore {
	/** Create a store that reads the current settings on every access. */
	constructor(
		private readonly app: App,
		private readonly get_settings: () => PluginSettings,
	) {}

	/** Normalized vault path of the todo file. */
	get path(): string {
		return normalizePath(this.get_settings().todoFile);
	}

	/** The todo file, or null if it does not exist. */
	get file(): TFile | null {
		return this.app.vault.getFileByPath(this.path);
	}

	/** Parsed task lines; null if the file does not exist. */
	async load(): Promise<TodoEntry[] | null> {
		const file = this.file;
		if (!file) return null;
		const content = await this.app.vault.cachedRead(file);
		return parse_todo_lines(content, { default_importance: this.get_settings().defaultImportance });
	}

	/** Create the todo file if missing (never overwrites). */
	async create_file(): Promise<TFile> {
		const existing = this.file;
		if (existing) return existing;
		const folder = this.path.split('/').slice(0, -1).join('/');
		if (folder && !this.app.vault.getFolderByPath(folder)) await this.app.vault.createFolder(folder);
		return this.app.vault.create(this.path, '');
	}

	/** Append a line at the end of the todo file (created if missing). */
	async append_line(line: string): Promise<void> {
		const file = await this.create_file();
		await this.app.vault.process(file, (content) => {
			if (content.length === 0) return `${line}\n`;
			const newline = content.includes('\r\n') ? '\r\n' : '\n';
			return content.endsWith('\n') ? `${content}${line}${newline}` : `${content}${newline}${line}${newline}`;
		});
	}

	/** Replace a task line if it is unchanged; false if the file or line changed meanwhile. */
	async update_line(entry: TodoEntry, replacement: string): Promise<boolean> {
		return this.replace_line_text(entry.line_no, entry.todo.raw, replacement);
	}

	/** Replace the line with text `expected` (near `line_no`); false if it is not found. */
	async replace_line_text(line_no: number, expected: string, replacement: string): Promise<boolean> {
		const file = this.file;
		if (!file) return false;
		let ok = false;
		await this.app.vault.process(file, (content) => {
			const result = replace_line(content, line_no, expected, replacement);
			ok = result !== null;
			return result ?? content;
		});
		return ok;
	}
}
