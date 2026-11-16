import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_SCHEMA_VERSION, parse_settings } from './settings';

describe('parse_settings', () => {
	it('returns defaults for missing data', () => {
		expect(parse_settings(null)).toEqual(DEFAULT_SETTINGS);
	});

	it('migrates version 1 (template example) to defaults', () => {
		const settings = parse_settings({ schemaVersion: 1, exampleFlag: true });
		expect(settings).toEqual(DEFAULT_SETTINGS);
		expect(settings.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION);
	});

	it('keeps valid values', () => {
		expect(
			parse_settings({ todoFile: ' Listen/Todos ', defaultImportance: 3, curveExponent: 2, quickDuration: '3D' }),
		).toMatchObject({ todoFile: 'Listen/Todos.md', defaultImportance: 3, curveExponent: 2, quickDuration: '3d' });
	});

	it('reads the note creator', () => {
		expect(parse_settings({ noteCreator: 'moc_tree_dialog' }).noteCreator).toBe('moc_tree_dialog');
		expect(parse_settings({ noteCreator: 'other' }).noteCreator).toBe('ripe');
	});

	it('reads the color scheme', () => {
		expect(parse_settings({ colorScheme: 'blue_red' }).colorScheme).toBe('blue_red');
		expect(parse_settings({ colorScheme: 'rainbow' }).colorScheme).toBe('green_red');
	});

	it('drops invalid values', () => {
		expect(
			parse_settings({ todoFile: '  ', defaultImportance: 2.5, curveExponent: 10, quickDuration: 'bald' }),
		).toEqual(DEFAULT_SETTINGS);
	});
});
