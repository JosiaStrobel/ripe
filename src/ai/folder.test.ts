import { describe, expect, it } from 'vitest';
import { ai_folder_issue, clean_folder_path, is_hidden_path } from './folder';

describe('clean_folder_path', () => {
	it('trims, converts backslashes and drops empty and dot segments', () => {
		expect(clean_folder_path(' /Meta\\./.ki// ')).toBe('Meta/.ki');
		expect(clean_folder_path(' / ')).toBe('');
		expect(clean_folder_path('.')).toBe('');
	});
});

describe('is_hidden_path', () => {
	it('detects a dot segment anywhere', () => {
		expect(is_hidden_path('.ai-context')).toBe(true);
		expect(is_hidden_path('Meta/.ki')).toBe(true);
		expect(is_hidden_path('Meta/KI')).toBe(false);
	});
});

describe('ai_folder_issue', () => {
	const files = ['ripe/tasks.md'];
	it('rejects an empty folder or the vault root', () => {
		expect(ai_folder_issue('', files, [])).toBe('empty');
		expect(ai_folder_issue(' / ', files, [])).toBe('empty');
	});

	it('rejects a folder whose helper file would replace a user file', () => {
		expect(ai_folder_issue('Listen', files, ['Listen/ripe/Tasks.md'])).toBe('conflict');
		expect(ai_folder_issue('/Listen/', files, ['Todos.md', 'Listen/ripe/tasks.md'])).toBe('conflict');
	});

	it('accepts dot folders and visible folders without conflicts', () => {
		expect(ai_folder_issue('.ai-context', files, ['Todos.md'])).toBeNull();
		expect(ai_folder_issue('Meta/KI', files, ['Todos.md', 'Einkaufen.md'])).toBeNull();
	});
});
