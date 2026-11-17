import type { App } from 'obsidian';
import { parse_todo_lines, type TodoEntry } from './parser/todo';
import type { PluginSettings } from './settings';
import { VaultFile } from './vault_file';

/** Reads and changes the todo file through the vault API. */
export class TodoStore extends VaultFile {
	/** Create a store that reads the current settings on every access. */
	constructor(
		app: App,
		private readonly get_settings: () => PluginSettings,
	) {
		super(app, () => get_settings().todoFile);
	}

	/** Parsed task lines; null if the file does not exist. */
	async load(): Promise<TodoEntry[] | null> {
		const content = await this.read();
		if (content === null) return null;
		return parse_todo_lines(content, { default_importance: this.get_settings().defaultImportance });
	}

	/** Append a line at the end of the todo file (created if missing). */
	async append_line(line: string): Promise<void> {
		await this.process((content) => {
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
		return this.replace_lines([{ line_no, before: expected, after: replacement }]);
	}
}
