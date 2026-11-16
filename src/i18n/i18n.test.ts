import { afterEach, describe, expect, it } from 'vitest';
import en from './en';
import { LANGUAGES, set_language, t } from './index';

/** Sorted placeholder names in a text. */
function placeholders(text: string): string[] {
	return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();
}

afterEach(() => set_language('en'));

describe('t', () => {
	it('fills placeholders', () => {
		expect(t('view.missing_file', { path: 'X.md' })).toBe('Todo file "X.md" not found.');
	});

	it('uses the selected language and matches regional codes', () => {
		set_language('de-AT');
		expect(t('action.done')).toBe('Erledigt');
	});

	it('falls back to English for unknown languages', () => {
		set_language('xx');
		expect(t('action.done')).toBe('Done');
	});
});

describe('translations', () => {
	it.each(Object.entries(LANGUAGES))('%s uses the same placeholders as English', (_, messages) => {
		for (const [key, text] of Object.entries(en)) {
			expect(placeholders(messages[key as keyof typeof en]), key).toEqual(placeholders(text));
		}
	});
});
