import { describe, expect, it } from 'vitest';
import { parse_shopping } from './parser';
import { plan_sections, shop_sections } from './sections';

const file = [
	'## Obst',
	'- Bananen [gekauft:: 2]',
	'- [ ] Äpfel [gekauft:: 9]',
	'- Birnen [gekauft:: 2]',
	'## Kühlregal',
	'- [x] Joghurt',
	'- Butter',
	'## Drogerie',
	'- [ ] Seife',
	'- [x] Zahnpasta',
].join('\n');

describe('plan_sections', () => {
	it('keeps store order and puts frequent items first', () => {
		const sections = plan_sections(parse_shopping(file));
		expect(sections.map((s) => s.name)).toEqual(['Obst', 'Kühlregal', 'Drogerie']);
		expect(sections[0]?.items.map((i) => i.name)).toEqual(['Äpfel', 'Bananen', 'Birnen']);
	});
});

describe('shop_sections', () => {
	it('lists open items per category and checked items at the end', () => {
		const { open, checked } = shop_sections(parse_shopping(file));
		expect(open.map((s) => [s.name, s.items.map((i) => i.name)])).toEqual([
			['Obst', ['Äpfel']],
			['Drogerie', ['Seife']],
		]);
		expect(checked.map((i) => i.name)).toEqual(['Joghurt', 'Zahnpasta']);
	});
});
