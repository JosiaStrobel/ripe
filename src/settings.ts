import { parse_duration } from './parser/duration';

/** Current version of the stored settings format. */
export const SETTINGS_SCHEMA_VERSION = 3;

/** Plugin settings as stored in data.json. */
export interface PluginSettings {
	schemaVersion: number;
	/** Vault path of the todo file. */
	todoFile: string;
	/** Vault path of the shopping list file. */
	shoppingFile: string;
	/** Importance for lines without `wichtig` (1–3). */
	defaultImportance: number;
	/** Urgency curve exponent k (u' = u^k); 1 = linear. */
	curveExponent: number;
	/** Aging duration for quick capture without shortcut or button, e.g. "1w". */
	quickDuration: string;
	/** Who creates detail notes; MOC Tree options apply only while that plugin is enabled. */
	noteCreator: NoteCreator;
	/** Color gradient of the urgency levels. */
	colorScheme: ColorScheme;
	/** Days until critical shown on the matrix time axis. */
	matrixRangeDays: number;
	/** Test tool: slider in the overview to simulate other days. */
	showTimeSlider: boolean;
}

/** Available color gradients (CSS class `ripe-scheme-<name>`). */
export type ColorScheme = 'green_red' | 'blue_red' | 'blue_yellow_red';
export const COLOR_SCHEMES: readonly ColorScheme[] = ['green_red', 'blue_red', 'blue_yellow_red'];

/** Creator of new detail notes. */
export type NoteCreator = 'ripe' | 'moc_tree' | 'moc_tree_dialog';
export const NOTE_CREATORS: readonly NoteCreator[] = ['ripe', 'moc_tree', 'moc_tree_dialog'];

/** Defaults for missing or invalid settings. */
export const DEFAULT_SETTINGS: Readonly<PluginSettings> = {
	schemaVersion: SETTINGS_SCHEMA_VERSION,
	todoFile: 'Todos.md',
	shoppingFile: 'Einkaufen.md',
	defaultImportance: 2,
	curveExponent: 1,
	quickDuration: '1w',
	noteCreator: 'ripe',
	colorScheme: 'green_red',
	matrixRangeDays: 14,
	showTimeSlider: false,
};

export const MATRIX_RANGE_MIN = 3;
export const MATRIX_RANGE_MAX = 60;

export const CURVE_MIN = 0.5;
export const CURVE_MAX = 3;

/** Durations offered as buttons in the quick capture. */
export const QUICK_DURATIONS: readonly string[] = ['1d', '3d', '1w', '2w', '1m'];

/** True for plain objects. */
function is_record(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Number within [min, max], or undefined. */
function number_in(value: unknown, min: number, max: number): number | undefined {
	return typeof value === 'number' && value >= min && value <= max ? value : undefined;
}

/** Normalize a markdown file path: trimmed, ".md" appended; undefined if empty. */
export function normalize_md_file(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const path = value.trim().replace(/^\/+/, '');
	if (path.length === 0) return undefined;
	return path.toLowerCase().endsWith('.md') ? path : `${path}.md`;
}

/** Validate raw stored data, migrate old schema versions and fill in defaults. */
export function parse_settings(raw: unknown): PluginSettings {
	const settings: PluginSettings = { ...DEFAULT_SETTINGS };
	if (!is_record(raw)) return settings;
	// Version 1 only had the template's example flag, version 3 added shoppingFile;
	// missing values get their defaults, nothing else to migrate.
	settings.todoFile = normalize_md_file(raw.todoFile) ?? settings.todoFile;
	settings.shoppingFile = normalize_md_file(raw.shoppingFile) ?? settings.shoppingFile;
	const importance = number_in(raw.defaultImportance, 1, 3);
	if (importance !== undefined && Number.isInteger(importance)) settings.defaultImportance = importance;
	settings.curveExponent = number_in(raw.curveExponent, CURVE_MIN, CURVE_MAX) ?? settings.curveExponent;
	if (typeof raw.quickDuration === 'string' && parse_duration(raw.quickDuration)) {
		settings.quickDuration = raw.quickDuration.trim().toLowerCase();
	}
	const range = number_in(raw.matrixRangeDays, MATRIX_RANGE_MIN, MATRIX_RANGE_MAX);
	if (range !== undefined && Number.isInteger(range)) settings.matrixRangeDays = range;
	if (typeof raw.showTimeSlider === 'boolean') settings.showTimeSlider = raw.showTimeSlider;
	settings.colorScheme = COLOR_SCHEMES.find((c) => c === raw.colorScheme) ?? settings.colorScheme;
	settings.noteCreator = NOTE_CREATORS.find((c) => c === raw.noteCreator) ?? settings.noteCreator;
	return settings;
}
