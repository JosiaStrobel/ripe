import { type App, normalizePath, TFile } from 'obsidian';
import { apply_line_changes, type LineChange } from './line_changes';

/** One markdown file in the vault whose path comes from the settings; never overwritten blindly. */
export class VaultFile {
	/** Create the accessor; `get_path` is read on every access, so setting changes apply at once. */
	constructor(
		protected readonly app: App,
		private readonly get_path: () => string,
	) {}

	/** Normalized vault path. */
	get path(): string {
		return normalizePath(this.get_path());
	}

	/** The file, or null if it does not exist. */
	get file(): TFile | null {
		return this.app.vault.getFileByPath(this.path);
	}

	/** File content, or null if the file does not exist. */
	async read(): Promise<string | null> {
		const file = this.file;
		return file ? this.app.vault.cachedRead(file) : null;
	}

	/** Create the file if missing (never overwrites). */
	async create_file(): Promise<TFile> {
		const existing = this.file;
		if (existing) return existing;
		const folder = this.path.split('/').slice(0, -1).join('/');
		if (folder && !this.app.vault.getFolderByPath(folder)) await this.app.vault.createFolder(folder);
		return this.app.vault.create(this.path, '');
	}

	/** Change the content atomically (file created if missing). */
	async process(fn: (content: string) => string): Promise<void> {
		await this.app.vault.process(await this.create_file(), fn);
	}

	/** Apply line changes, all or nothing; false if the file or a line changed meanwhile. */
	async replace_lines(changes: readonly LineChange[]): Promise<boolean> {
		const file = this.file;
		if (!file) return false;
		let ok = false;
		await this.app.vault.process(file, (content) => {
			const result = apply_line_changes(content, changes);
			ok = result !== null;
			return result ?? content;
		});
		return ok;
	}
}
