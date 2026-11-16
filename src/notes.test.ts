import { describe, expect, it } from 'vitest';
import { note_label, note_name, remove_note_link, set_note_link, unique_name } from './notes';
import { parse_todo } from './parser/todo';

describe('set_note_link', () => {
	it('appends a link and the parser finds it as note', () => {
		const line = set_note_link('- [ ] Flug buchen [fällig:: 2026-12-01] [log:: [[L]]]  ', 'Reise');
		expect(line).toBe('- [ ] Flug buchen [fällig:: 2026-12-01] [log:: [[L]]] [[Reise]]');
		expect(parse_todo(line, { default_importance: 2 })?.note).toBe('Reise');
	});

	it('replaces an existing note link in place', () => {
		expect(set_note_link('- [ ] A [[Alt|x]] [b:: 1]', 'Ordner/Neu')).toBe('- [ ] A [[Ordner/Neu]] [b:: 1]');
	});
});

describe('remove_note_link', () => {
	it('removes only the note link', () => {
		expect(remove_note_link('- [ ] A [[N]] [log:: [[L]]]')).toBe('- [ ] A [log:: [[L]]]');
		expect(remove_note_link('- [ ] A [b:: 1]')).toBe('- [ ] A [b:: 1]');
	});
});

describe('note_name', () => {
	it('removes characters not allowed in file names', () => {
		expect(note_name('Flug buchen: Lissabon / Porto?')).toBe('Flug buchen Lissabon Porto');
		expect(note_name('#tag [x] a|b')).toBe('tag x a b');
		expect(note_name('.versteckt')).toBe('versteckt');
		expect(note_name(' ?? ')).toBeNull();
	});

	it('limits the length', () => {
		expect(note_name('x'.repeat(150))).toHaveLength(100);
	});
});

describe('unique_name', () => {
	it('adds a number if the name is taken', () => {
		const taken = new Set(['A', 'A 1']);
		expect(unique_name('A', (n) => taken.has(n))).toBe('A 2');
		expect(unique_name('B', (n) => taken.has(n))).toBe('B');
	});
});

describe('note_label', () => {
	it('reads title and aliases without repeating the title', () => {
		expect(note_label({ title: 'Reise', aliases: ['Reise', 'Lissabon', 3] })).toEqual({
			title: 'Reise',
			aliases: ['Lissabon'],
		});
		expect(note_label({ aliases: 'Einzeln' })).toEqual({ title: null, aliases: ['Einzeln'] });
		expect(note_label(undefined)).toEqual({ title: null, aliases: [] });
	});
});
