import { describe, expect, it } from 'vitest';
import { has_long_word, SOFT_HYPHEN, soft_hyphenate } from './hyphenate';

const shown = (text: string): string => text.replaceAll(SOFT_HYPHEN, '|');

describe('has_long_word', () => {
	it('finds words from 12 characters', () => {
		expect(has_long_word('Blumen gießen')).toBe(false);
		expect(has_long_word('Steuererklärung machen')).toBe(true);
	});
});

describe('soft_hyphenate', () => {
	it('keeps short words and spaces unchanged', () => {
		expect(soft_hyphenate('Blumen gießen')).toBe('Blumen gießen');
	});

	it('adds break opportunities inside long words, not at the edges', () => {
		expect(shown(soft_hyphenate('Steuererklärung'))).toBe('Ste|u|e|r|e|r|k|l|ä|r|ung');
	});

	it('only touches long words and keeps the visible text', () => {
		const result = soft_hyphenate('Neue Steuererklärungsunterlagen holen');
		expect(result.replaceAll(SOFT_HYPHEN, '')).toBe('Neue Steuererklärungsunterlagen holen');
		expect(result.startsWith('Neue Ste')).toBe(true);
	});

	it('does not add hyphens next to digits or dashes', () => {
		expect(shown(soft_hyphenate('Abschluss-2026-Bericht'))).toBe('Abs|c|h|l|u|s|s-2026-B|e|r|i|cht');
	});
});
