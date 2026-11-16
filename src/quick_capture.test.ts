import { describe, expect, it } from 'vitest';
import { parse_date } from './parser/date';
import { parse_quick } from './quick_capture';

const TODAY = parse_date('2026-11-16') ?? 0;

/** Parse with fallback 1w and importance 2. */
function quick(text: string, fallback = '1w'): ReturnType<typeof parse_quick> {
	return parse_quick(text, TODAY, fallback, 2);
}

describe('parse_quick', () => {
	it('recognizes an aging duration', () => {
		expect(quick('Anna zurückschreiben 5D')).toEqual({
			draft: {
				title: 'Anna zurückschreiben',
				kind: 'aging',
				values: { created: '2026-11-16', critical_after: '5d' },
				importance: 2,
			},
			shortcut: true,
		});
	});

	it('recognizes a deadline', () => {
		const { draft } = quick('Flug buchen 2026-12-01');
		expect(draft).toMatchObject({ title: 'Flug buchen', kind: 'deadline', values: { due: '2026-12-01' } });
	});

	it('recognizes intervals with half tolerance', () => {
		const { draft } = quick('Blumen gießen alle 6d');
		expect(draft).toMatchObject({
			title: 'Blumen gießen',
			kind: 'interval',
			values: { every: '6d', tolerance: '3d' },
		});
	});

	it('recognizes calendar rules', () => {
		expect(quick('Müll raus jeden di, fr').draft).toMatchObject({
			title: 'Müll raus',
			kind: 'calendar',
			values: { schedule: 'di, fr' },
		});
	});

	it('falls back to aging with the chosen duration', () => {
		expect(quick('Fahrrad ölen', '3d')).toMatchObject({
			draft: { title: 'Fahrrad ölen', kind: 'aging', values: { critical_after: '3d' } },
			shortcut: false,
		});
	});

	it('keeps text that only looks like a shortcut', () => {
		expect(quick('Kapitel 2026-13-01').draft.title).toBe('Kapitel 2026-13-01');
		expect(quick('Alle Fenster putzen').draft.title).toBe('Alle Fenster putzen');
		expect(quick('5d').draft.title).toBe('5d');
		expect(quick('Treffen jeden Tag').draft.title).toBe('Treffen jeden Tag');
	});
});
