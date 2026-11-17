import { debounce, getLanguage, Notice, Plugin, type TAbstractFile, type View } from 'obsidian';
import { FormatExportWriter } from './ai/format_export_writer';
import { apply_color_scheme } from './color_scheme';
import { set_language, t } from './i18n';
import { today } from './parser/date';
import { DEFAULT_SETTINGS, parse_settings, type PluginSettings } from './settings';
import { SettingsTab } from './settings_tab';
import { NoteLinker } from './modals/note_linker';
import { TaskEditor } from './modals/task_editor';
import { ShoppingActions } from './shopping/shopping_actions';
import { ShoppingStore } from './shopping/store';
import { TodoStore } from './store';
import { UndoManager } from './undo';
import { OVERVIEW_VIEW_TYPE, OverviewView } from './views/overview_view';
import { SHOPPING_VIEW_TYPE, ShoppingView } from './views/shopping_view';

const DAY_CHECK_INTERVAL_MS = 60_000;

/** Plugin entry: lifecycle and registration only, logic lives in modules. */
export default class MainPlugin extends Plugin {
	settings: PluginSettings = { ...DEFAULT_SETTINGS };
	private readonly store = new TodoStore(this.app, () => this.settings);
	private readonly editor = new TaskEditor(this.app, this.store, () => this.settings);
	private readonly notes = new NoteLinker(this.app, this.store, () => this.settings);
	private readonly undo = new UndoManager(() => this.refresh_views());
	private readonly shopping = new ShoppingActions(
		new ShoppingStore(this.app, () => this.settings),
		this.undo,
		() => this.refresh_views(),
	);
	private readonly ai_format = new FormatExportWriter(this.app, () => this.settings);
	private readonly refresh_views_debounced = debounce(() => this.refresh_views(), 300, true);

	async onload(): Promise<void> {
		set_language(getLanguage());
		await this.load_settings();
		apply_color_scheme(this.settings.colorScheme);
		this.addSettingTab(new SettingsTab(this.app, this));

		this.registerView(
			OVERVIEW_VIEW_TYPE,
			(leaf) =>
				new OverviewView(leaf, {
					store: this.store,
					editor: this.editor,
					notes: this.notes,
					undo: this.undo,
					get_settings: () => this.settings,
				}),
		);
		this.addRibbonIcon('apple', t('command.open_overview'), () => this.open_overview());
		this.addCommand({
			id: 'open-overview',
			name: t('command.open_overview'),
			callback: () => this.open_overview(),
		});
		this.addCommand({ id: 'add-task', name: t('command.add_task'), callback: () => this.editor.add() });
		this.addCommand({
			id: 'toggle-layout',
			name: t('command.toggle_layout'),
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(OverviewView);
				if (!view) return false;
				if (!checking) void view.toggle_layout();
				return true;
			},
		});
		this.addCommand({
			id: 'undo-last',
			name: t('command.undo'),
			checkCallback: (checking) => {
				if (!this.undo.can_undo) return false;
				if (!checking) void this.undo.undo();
				return true;
			},
		});
		this.addCommand({ id: 'quick-add', name: t('command.quick_add'), callback: () => this.editor.quick() });
		this.register_shopping();
		this.addCommand({
			id: 'write-ai-format-file',
			name: t('command.write_ai_format_file'),
			callback: () => void this.write_ai_format(),
		});
		this.ai_format.attach(this);

		this.app.workspace.onLayoutReady(() => this.register_watchers());
	}

	/** Shopping list view and its commands. */
	private register_shopping(): void {
		this.registerView(SHOPPING_VIEW_TYPE, (leaf) => new ShoppingView(leaf, this.shopping));
		this.addRibbonIcon('shopping-cart', t('command.open_shopping'), () => this.open_view(SHOPPING_VIEW_TYPE));
		this.addCommand({
			id: 'open-shopping',
			name: t('command.open_shopping'),
			callback: () => this.open_view(SHOPPING_VIEW_TYPE),
		});
		this.addCommand({
			id: 'add-shopping-item',
			name: t('command.add_item'),
			callback: async () => {
				const view = await this.open_view(SHOPPING_VIEW_TYPE);
				if (view instanceof ShoppingView) view.add_item();
			},
		});
		this.addCommand({
			id: 'toggle-shopping-mode',
			name: t('command.toggle_shopping_mode'),
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(ShoppingView);
				if (!view) return false;
				if (!checking) void view.toggle_mode();
				return true;
			},
		});
	}

	/** Redraw on changes to the todo or shopping file and when the day changes. */
	private register_watchers(): void {
		const on_file = (file: TAbstractFile, old_path?: string): void => {
			const paths = [this.store.path, this.shopping.store.path];
			if (paths.includes(file.path) || (old_path !== undefined && paths.includes(old_path))) {
				this.refresh_views_debounced();
			}
		};
		this.registerEvent(this.app.vault.on('modify', (file) => on_file(file)));
		this.registerEvent(this.app.vault.on('create', (file) => on_file(file)));
		this.registerEvent(this.app.vault.on('delete', (file) => on_file(file)));
		this.registerEvent(this.app.vault.on('rename', on_file));

		let day = today();
		this.registerInterval(
			window.setInterval(() => {
				if (today() === day) return;
				day = today();
				this.refresh_views();
			}, DAY_CHECK_INTERVAL_MS),
		);
	}

	/** Reveal the overview, opening it in a new tab if needed. */
	async open_overview(): Promise<void> {
		await this.open_view(OVERVIEW_VIEW_TYPE);
	}

	/** Reveal a view of the given type, opening it in a new tab if needed. */
	private async open_view(type: string): Promise<View> {
		const { workspace } = this.app;
		const leaf = workspace.getLeavesOfType(type)[0] ?? workspace.getLeaf('tab');
		if (leaf.view.getViewType() !== type) await leaf.setViewState({ type, active: true });
		await workspace.revealLeaf(leaf);
		return leaf.view;
	}

	/** Write the AI format file now, even if the setting is off. */
	private async write_ai_format(): Promise<void> {
		try {
			new Notice(t('notice.ai_format_file_written', { path: await this.ai_format.write() }));
		} catch (error) {
			console.error('Ripe: writing the AI format file failed', error);
			new Notice(t('notice.ai_format_file_failed'));
		}
	}

	/** Redraw all open overviews and shopping lists. */
	refresh_views(): void {
		for (const type of [OVERVIEW_VIEW_TYPE, SHOPPING_VIEW_TYPE]) {
			for (const leaf of this.app.workspace.getLeavesOfType(type)) {
				const view = leaf.view;
				if (view instanceof OverviewView || view instanceof ShoppingView) void view.render();
			}
		}
	}

	onunload(): void {
		apply_color_scheme(null);
	}

	/** Load and validate settings from data.json. */
	async load_settings(): Promise<void> {
		this.settings = parse_settings(await this.loadData());
	}

	/** Persist the current settings to data.json and redraw. */
	async save_settings(): Promise<void> {
		await this.saveData(this.settings);
		apply_color_scheme(this.settings.colorScheme);
		this.refresh_views();
		this.ai_format.schedule();
	}
}
