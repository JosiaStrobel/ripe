import { describe, expect, it } from 'vitest';
import { parse_item, parse_shopping } from './parser';

describe('parse_item', () => {
	it('reads the three states', () => {
		expect(parse_item('- Äpfel', 0)?.state).toBe('catalog');
		expect(parse_item('- [ ] Äpfel', 0)?.state).toBe('listed');
		expect(parse_item('- [x] Äpfel', 0)?.state).toBe('checked');
		expect(parse_item('* [X] Äpfel', 0)?.state).toBe('checked');
	});

	it('reads name and bought count', () => {
		const item = parse_item('- [ ] Milch [gekauft:: 31]', 4);
		expect(item).toMatchObject({ name: 'Milch', bought: 31, line_no: 4 });
	});

	it('treats a missing or invalid count as 0', () => {
		expect(parse_item('- Milch', 0)?.bought).toBe(0);
		expect(parse_item('- Milch [gekauft:: viel]', 0)?.bought).toBe(0);
	});

	it('ignores nested items, empty items and other text', () => {
		expect(parse_item('  - Milch', 0)).toBeNull();
		expect(parse_item('- [ ] ', 0)).toBeNull();
		expect(parse_item('Milch', 0)).toBeNull();
	});
});

describe('parse_shopping', () => {
	const file = [
		'---',
		'tags: [einkauf]',
		'---',
		'- Brot',
		'## Obst & Gemüse',
		'- Äpfel [gekauft:: 14]',
		'- [ ] Bananen',
		'',
		'## Kühlregal',
		'Notiz zum Regal',
		'- [x] Joghurt',
		'```',
		'- Code',
		'```',
		'## Leer',
	].join('\r\n');

	it('groups items by heading in file order', () => {
		const categories = parse_shopping(file);
		expect(categories.map((c) => c.name)).toEqual(['', 'Obst & Gemüse', 'Kühlregal', 'Leer']);
		expect(categories[1]?.items.map((i) => i.name)).toEqual(['Äpfel', 'Bananen']);
		expect(categories[2]?.items.map((i) => i.name)).toEqual(['Joghurt']);
		expect(categories[3]?.items).toEqual([]);
	});

	it('keeps line numbers and strips carriage returns', () => {
		const categories = parse_shopping(file);
		expect(categories[0]?.items[0]).toMatchObject({ line_no: 3, raw: '- Brot' });
		expect(categories[1]?.line_no).toBe(4);
	});

	it('drops the unnamed category when it is empty', () => {
		expect(parse_shopping('## A\n- x').map((c) => c.name)).toEqual(['A']);
	});
});
