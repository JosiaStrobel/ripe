import { describe, expect, it } from 'vitest';
import {
	find_field,
	parse_fields,
	remove_field,
	set_field,
	strip_fields,
	wiki_link_target,
} from './fields';

const LINE = '- [ ] Blumen gießen [alle:: 6d] [log:: [[Blumen gießen (Log)|Log]]] [[Notiz]] [x:: 1]';

describe('fields', () => {
	it('finds fields, including values with wiki links', () => {
		const fields = parse_fields(LINE);
		expect(fields.map((f) => [f.key, f.value])).toEqual([
			['alle', '6d'],
			['log', '[[Blumen gießen (Log)|Log]]'],
			['x', '1'],
		]);
	});

	it('ignores checkboxes, plain brackets and wiki links', () => {
		expect(parse_fields('- [ ] a [b] [[c]] [d: e]')).toEqual([]);
	});

	it('survives unbalanced brackets', () => {
		expect(parse_fields('- [ ] a [b:: 1] [oops')).toHaveLength(1);
	});

	it('matches keys case-insensitively', () => {
		expect(find_field('x [Alle:: 6d]', 'alle')?.value).toBe('6d');
	});

	it('sets an existing field in place and keeps everything else', () => {
		expect(set_field(LINE, 'alle', '7d')).toBe(LINE.replace('[alle:: 6d]', '[alle:: 7d]'));
	});

	it('appends a missing field', () => {
		expect(set_field('- [ ] a [b:: 1]  ', 'c', '2')).toBe('- [ ] a [b:: 1] [c:: 2]');
	});

	it('removes a field with one space', () => {
		expect(remove_field('- [ ] a [b:: 1] [c:: 2]', 'b')).toBe('- [ ] a [c:: 2]');
		expect(remove_field('[b:: 1] a', 'b')).toBe('a');
		expect(remove_field('a', 'b')).toBe('a');
	});

	it('strips fields from text', () => {
		expect(strip_fields('Flug  buchen [fällig:: 2026-12-01] [[Reise]]')).toBe('Flug buchen [[Reise]]');
	});

	it('extracts wiki link targets', () => {
		expect(wiki_link_target('[[Reise#Flug|Flug]]')).toBe('Reise');
		expect(wiki_link_target('kein Link')).toBeNull();
	});
});
