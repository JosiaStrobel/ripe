import { type App, type Component, debounce, normalizePath } from 'obsidian';
import { today } from '../parser/date';
import type { PluginSettings } from '../settings';
import type { TodoStore } from '../store';
import { ai_folder_issue } from './folder';
import { render_tasks_export, TASKS_EXPORT_NAME } from './tasks_export';

/** Quiet time after the last change before the file is rewritten, in ms. */
const WRITE_DELAY_MS = 5000;

/**
 * Keeps the task file for AI tools up to date while the setting is on. The file is shared via Git
 * and written on every device, so it is compared with the file on disk before each write (a pull
 * may have replaced or union-merged it) and never parsed.
 */
export class TasksExportWriter {
	private readonly debounced = debounce(() => void this.write_if_enabled(), WRITE_DELAY_MS, true);

	/** Create the writer; settings are read on every write. */
	constructor(
		private readonly app: App,
		private readonly store: TodoStore,
		private readonly get_settings: () => PluginSettings,
	) {}

	/** Start after the layout is ready; pending writes are cancelled with the component. */
	attach(component: Component): void {
		component.register(() => this.debounced.cancel());
		this.app.workspace.onLayoutReady(() => this.schedule());
	}

	/** Request a delayed write (todo file, day or settings changed). */
	schedule(): void {
		this.debounced();
	}

	/** Write now regardless of the setting (command); returns the vault path. */
	async write(): Promise<string> {
		const settings = this.get_settings();
		const user_files = [settings.todoFile, settings.shoppingFile];
		if (ai_folder_issue(settings.aiFolder, [TASKS_EXPORT_NAME], user_files) !== null) {
			throw new Error(`Ripe: AI folder "${settings.aiFolder}" is not usable`);
		}
		const content = render_tasks_export(await this.store.load(), today(), {
			todo_file: this.store.path,
			curve_exponent: settings.curveExponent,
		});
		const path = normalizePath(`${settings.aiFolder}/${TASKS_EXPORT_NAME}`);
		// The vault index does not know dot folders, so go through the adapter.
		const adapter = this.app.vault.adapter;
		if ((await adapter.exists(path)) && (await adapter.read(path)) === content) return path;
		await this.ensure_folder(path.slice(0, path.lastIndexOf('/')));
		await adapter.write(path, content);
		return path;
	}

	/** Create a folder and its missing parents. */
	private async ensure_folder(folder: string): Promise<void> {
		const adapter = this.app.vault.adapter;
		const segments = folder.split('/');
		for (let i = 1; i <= segments.length; i++) {
			const part = segments.slice(0, i).join('/');
			if (part !== '' && !(await adapter.exists(part))) await adapter.mkdir(part);
		}
	}

	/** Scheduled write; only while the setting is on. */
	private async write_if_enabled(): Promise<void> {
		if (!this.get_settings().aiTasksFile) return;
		try {
			await this.write();
		} catch (error) {
			console.error('Ripe: writing the AI task file failed', error);
		}
	}
}
