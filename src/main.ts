import { debounce, getLanguage, Plugin, type TAbstractFile } from 'obsidian';
import { set_language, t } from './i18n';
import { today } from './parser/date';
import { DEFAULT_SETTINGS, parse_settings, type PluginSettings } from './settings';
import { SettingsTab } from './settings_tab';
import { TodoStore } from './store';
import { OVERVIEW_VIEW_TYPE, OverviewView } from './views/overview_view';

const DAY_CHECK_INTERVAL_MS = 60_000;

/** Plugin entry: lifecycle and registration only, logic lives in modules. */
export default class MainPlugin extends Plugin {
	settings: PluginSettings = { ...DEFAULT_SETTINGS };
	private readonly store = new TodoStore(this.app, () => this.settings);
	private readonly refresh_views_debounced = debounce(() => this.refresh_views(), 300, true);

	async onload(): Promise<void> {
		set_language(getLanguage());
		await this.load_settings();
		this.addSettingTab(new SettingsTab(this.app, this));

		this.registerView(
			OVERVIEW_VIEW_TYPE,
			(leaf) =>
				new OverviewView(leaf, this.store, () => ({ curve_exponent: this.settings.curveExponent })),
		);
		this.addRibbonIcon('apple', t('command.open_overview'), () => this.open_overview());
		this.addCommand({
			id: 'open-overview',
			name: t('command.open_overview'),
			callback: () => this.open_overview(),
		});

		this.app.workspace.onLayoutReady(() => this.register_watchers());
	}

	/** Redraw on changes to the todo file and when the day changes. */
	private register_watchers(): void {
		const on_file = (file: TAbstractFile, old_path?: string): void => {
			if (file.path === this.store.path || old_path === this.store.path) {
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
		const { workspace } = this.app;
		const leaf = workspace.getLeavesOfType(OVERVIEW_VIEW_TYPE)[0] ?? workspace.getLeaf('tab');
		if (leaf.view.getViewType() !== OVERVIEW_VIEW_TYPE) {
			await leaf.setViewState({ type: OVERVIEW_VIEW_TYPE, active: true });
		}
		await workspace.revealLeaf(leaf);
	}

	/** Redraw all open overviews. */
	refresh_views(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(OVERVIEW_VIEW_TYPE)) {
			if (leaf.view instanceof OverviewView) void leaf.view.render();
		}
	}

	/** Load and validate settings from data.json. */
	async load_settings(): Promise<void> {
		this.settings = parse_settings(await this.loadData());
	}

	/** Persist the current settings to data.json and redraw. */
	async save_settings(): Promise<void> {
		await this.saveData(this.settings);
		this.refresh_views();
	}
}
