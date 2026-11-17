import { type App, PluginSettingTab, type SettingDefinitionItem } from 'obsidian';
import { t } from './i18n';
import { moc_tree_api } from './integrations/moc_tree';
import type MainPlugin from './main';
import { parse_duration } from './parser/duration';
import {
	CURVE_MAX,
	CURVE_MIN,
	MATRIX_RANGE_MAX,
	MATRIX_RANGE_MIN,
	normalize_md_file,
	parse_settings,
} from './settings';

/** Settings tab of the plugin (declarative, searchable in Obsidian's settings). */
export class SettingsTab extends PluginSettingTab {
	/** Create the tab for the plugin. */
	constructor(
		app: App,
		private readonly plugin: MainPlugin,
	) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: t('settings.todo_file.name'),
				desc: t('settings.todo_file.desc'),
				control: {
					type: 'file',
					key: 'todoFile',
					placeholder: 'Todos.md',
					filter: (file) => file.extension === 'md',
					validate: (value) => (normalize_md_file(value) ? undefined : t('settings.todo_file.desc')),
				},
			},
			{
				name: t('settings.shopping_file.name'),
				desc: t('settings.shopping_file.desc'),
				control: {
					type: 'file',
					key: 'shoppingFile',
					placeholder: 'Einkaufen.md',
					filter: (file) => file.extension === 'md',
					validate: (value) => (normalize_md_file(value) ? undefined : t('settings.shopping_file.desc')),
				},
			},
			{
				name: t('settings.importance.name'),
				desc: t('settings.importance.desc'),
				control: {
					type: 'dropdown',
					key: 'defaultImportance',
					options: {
						'1': t('settings.importance.low'),
						'2': t('settings.importance.normal'),
						'3': t('settings.importance.high'),
					},
				},
			},
			{
				name: t('settings.curve.name'),
				desc: t('settings.curve.desc'),
				control: {
					type: 'slider',
					key: 'curveExponent',
					min: CURVE_MIN,
					max: CURVE_MAX,
					step: 0.1,
					displayFormat: (value) => value.toFixed(1),
				},
			},
			{
				name: t('settings.color_scheme.name'),
				desc: t('settings.color_scheme.desc'),
				control: {
					type: 'dropdown',
					key: 'colorScheme',
					options: {
						green_red: t('settings.color_scheme.green_red'),
						blue_red: t('settings.color_scheme.blue_red'),
						blue_yellow_red: t('settings.color_scheme.blue_yellow_red'),
					},
				},
			},
			{
				name: t('settings.matrix_range.name'),
				desc: t('settings.matrix_range.desc'),
				control: {
					type: 'slider',
					key: 'matrixRangeDays',
					min: MATRIX_RANGE_MIN,
					max: MATRIX_RANGE_MAX,
					step: 1,
				},
			},
			{
				name: t('settings.quick_duration.name'),
				desc: t('settings.quick_duration.desc'),
				control: {
					type: 'text',
					key: 'quickDuration',
					placeholder: '1w',
					validate: (value) => (parse_duration(value) ? undefined : t('settings.invalid_duration')),
				},
			},
			{
				name: t('settings.note_creator.name'),
				desc: t('settings.note_creator.desc'),
				visible: () => moc_tree_api(this.app) !== null,
				control: {
					type: 'dropdown',
					key: 'noteCreator',
					options: {
						ripe: t('settings.note_creator.ripe'),
						moc_tree: t('settings.note_creator.moc_tree'),
						moc_tree_dialog: t('settings.note_creator.moc_tree_dialog'),
					},
				},
			},
			{
				name: t('settings.time_slider.name'),
				desc: t('settings.time_slider.desc'),
				control: { type: 'toggle', key: 'showTimeSlider' },
			},
		];
	}

	getControlValue(key: string): unknown {
		const value = super.getControlValue(key);
		return key === 'defaultImportance' ? String(value) : value;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const converted = key === 'defaultImportance' ? Number(value) : value;
		// Validate through parse_settings so invalid input never gets stored.
		this.plugin.settings = parse_settings({ ...this.plugin.settings, [key]: converted });
		await this.plugin.save_settings();
	}
}
