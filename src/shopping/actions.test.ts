import { describe, expect, it } from 'vitest';
import { apply_line_changes, invert_changes } from '../line_changes';
import { finish_changes, find_item, insert_item, set_item_state, state_change } from './actions';
import { parse_item, parse_shopping } from './parser';

describe('set_item_state', () => {
	it('switches between the three list styles', () => {
		expect(set_item_state('- Milch [gekauft:: 3]', 'listed')).toBe('- [ ] Milch [gekauft:: 3]');
		expect(set_item_state('- [ ] Milch', 'checked')).toBe('- [x] Milch');
		expect(set_item_state('* [x] Milch', 'catalog')).toBe('* Milch');
	});

	it('reports no change for the same state', () => {
		const item = parse_item('- [ ] Milch', 2);
		expect(item && state_change(item, 'listed')).toBeNull();
		expect(item && state_change(item, 'checked')).toEqual({ line_no: 2, before: '- [ ] Milch', after: '- [x] Milch' });
	});
});

describe('finish_changes', () => {
	const file = '## A\n- [x] Milch [gekauft:: 2]\n- [ ] Brot\n- [x] Käse\n- Salz';

	it('moves checked items to the catalog and counts them', () => {
		const result = apply_line_changes(file, finish_changes(parse_shopping(file)));
		expect(result).toBe('## A\n- Milch [gekauft:: 3]\n- [ ] Brot\n- Käse [gekauft:: 1]\n- Salz');
	});

	it('can be reverted', () => {
		const changes = finish_changes(parse_shopping(file));
		const done = apply_line_changes(file, changes) ?? '';
		expect(apply_line_changes(done, invert_changes(changes))).toBe(file);
	});

	it('changes nothing if a line was edited meanwhile', () => {
		const changes = finish_changes(parse_shopping(file));
		expect(apply_line_changes(file.replace('Käse', 'Gouda'), changes)).toBeNull();
	});
});

describe('find_item', () => {
	it('matches names case-insensitively', () => {
		expect(find_item(parse_shopping('- [ ] Milch [gekauft:: 1]'), ' milch ')?.line_no).toBe(0);
		expect(find_item(parse_shopping('- Milch'), 'Brot')).toBeUndefined();
	});
});

describe('insert_item', () => {
	it('appends after the last item of the category', () => {
		const file = '## A\n- x\n\n## B\n- y\n';
		expect(insert_item(file, 'A', '- [ ] z')).toBe('## A\n- x\n- [ ] z\n\n## B\n- y\n');
	});

	it('inserts below the heading of an empty category', () => {
		expect(insert_item('## A\n## B', 'A', '- [ ] z')).toBe('## A\n- [ ] z\n## B');
	});

	it('keeps CRLF line endings', () => {
		expect(insert_item('## A\r\n- x\r\n', 'A', '- [ ] z')).toBe('## A\r\n- x\r\n- [ ] z\r\n');
	});

	it('creates a missing category at the end', () => {
		expect(insert_item('## A\n- x\n\n', 'B', '- [ ] z')).toBe('## A\n- x\n\n## B\n- [ ] z\n');
		expect(insert_item('', 'B', '- [ ] z')).toBe('## B\n- [ ] z\n');
		expect(insert_item('', '', '- [ ] z')).toBe('- [ ] z\n');
	});

	it('puts items without category above the first heading', () => {
		expect(insert_item('---\na: 1\n---\n## A\n- x', '', '- [ ] z')).toBe('---\na: 1\n---\n- [ ] z\n## A\n- x');
	});
});
