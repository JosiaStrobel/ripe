import { describe, expect, it } from 'vitest';
import {
	apply_draft,
	draft_from_line,
	empty_draft,
	date_before,
	half_duration,
	duration_before,
	validate_draft,
	type TaskDraft,
} from './draft';
import { parse_date } from './parser/date';

const TODAY = parse_date('2026-11-16') ?? 0;

/** Draft for a line that must parse. */
function draft_of(line: string): TaskDraft {
	const draft = draft_from_line(line, 2);
	if (!draft) throw new Error(`not a task: ${line}`);
	return draft;
}

describe('new tasks', () => {
	it('builds a line from a draft', () => {
		const draft = empty_draft('aging', TODAY, 2);
		draft.title = 'Anna zurückschreiben';
		draft.values.critical_after = '5d';
		expect(apply_draft(null, draft, 2)).toBe(
			'- [ ] Anna zurückschreiben [erstellt:: 2026-11-16] [kritisch_nach:: 5d]',
		);
	});

	it('writes importance only if it differs from the default', () => {
		const draft: TaskDraft = { title: 'X', kind: 'deadline', values: { due: '2026-12-01' }, importance: 3, start_level: 1 };
		expect(apply_draft(null, draft, 2)).toBe('- [ ] X [fällig:: 2026-12-01] [wichtig:: 3]');
		draft.importance = 2;
		expect(apply_draft(null, draft, 2)).toBe('- [ ] X [fällig:: 2026-12-01]');
	});

	it('writes the start level only above 1 and removes it again', () => {
		const draft: TaskDraft = { title: 'X', kind: 'none', values: {}, importance: 2, start_level: 3 };
		const line = apply_draft(null, draft, 2);
		expect(line).toBe('- [ ] X [startstufe:: 3]');
		expect(draft_of(line).start_level).toBe(3);
		draft.start_level = 1;
		expect(apply_draft(line, draft, 2)).toBe('- [ ] X');
	});

	it('ignores values of other kinds', () => {
		const draft: TaskDraft = {
			title: 'X',
			kind: 'none',
			values: { due: '2026-12-01', every: '6d' },
			importance: 2,
			start_level: 1,
		};
		expect(apply_draft(null, draft, 2)).toBe('- [ ] X');
	});
});

describe('editing', () => {
	const line =
		'  - [ ] Flug buchen [faellig:: 2026-12-01] [vorlauf:: 3w] [eigenes:: ja] [[Reise]] [log:: [[L]]]';

	it('reads a draft from a line', () => {
		expect(draft_of(line)).toEqual({
			title: 'Flug buchen',
			kind: 'deadline',
			values: { due: '2026-12-01', lead: '3w' },
			importance: 2,
			start_level: 1,
		});
	});

	it('round-trips a line, only normalizing alias keys', () => {
		expect(apply_draft(line, draft_of(line), 2)).toBe(
			'  - [ ] Flug buchen [vorlauf:: 3w] [eigenes:: ja] [[Reise]] [log:: [[L]]] [fällig:: 2026-12-01]',
		);
		const plain = '- [x] A [fällig:: 2026-12-01] [[N]] [wichtig:: 2]';
		expect(apply_draft(plain, draft_of(plain), 2)).toBe(plain);
	});

	it('changes title and kind, keeping note link and unknown fields', () => {
		const draft = draft_of(line);
		draft.title = 'Flug früher buchen';
		draft.kind = 'aging';
		draft.values = { ...draft.values, created: '2026-11-16', critical_after: '1w' };
		expect(apply_draft(line, draft, 2)).toBe(
			'  - [ ] Flug früher buchen [eigenes:: ja] [[Reise]] [log:: [[L]]] [erstellt:: 2026-11-16] [kritisch_nach:: 1w]',
		);
	});

	it('detects the kind of invalid lines', () => {
		expect(draft_of('- [ ] G [alle:: 6d]').kind).toBe('interval');
	});
});

describe('validate_draft', () => {
	it('reports missing title and required fields', () => {
		const draft = empty_draft('interval', TODAY, 2);
		draft.values.every = '6d';
		expect(validate_draft(draft, 2)).toEqual([
			{ code: 'missing_field', field: 'title' },
			{ code: 'missing_field', field: 'toleranz' },
		]);
	});

	it('accepts a complete draft', () => {
		const draft = empty_draft('aging', TODAY, 2);
		draft.title = 'X';
		draft.values.critical_after = '5d';
		expect(validate_draft(draft, 2)).toEqual([]);
	});
});

describe('half_duration', () => {
	it('halves to days or weeks', () => {
		expect(half_duration('6d')).toBe('3d');
		expect(half_duration('5d')).toBe('3d');
		expect(half_duration('2w')).toBe('1w');
		expect(half_duration('1w')).toBe('4d');
		expect(half_duration('1m')).toBe('15d');
		expect(half_duration('x')).toBeNull();
		expect(half_duration('0d')).toBeNull();
	});
});

describe('durations entered as dates', () => {
	it('computes the lead from a date', () => {
		expect(duration_before('2026-12-01', '2026-11-10')).toBe('3w');
		expect(duration_before('2026-12-01', '2026-11-19')).toBe('12d');
		expect(duration_before('2026-12-01', '2026-12-01')).toBe('0d');
	});

	it('rejects dates after the due date or invalid input', () => {
		expect(duration_before('2026-12-01', '2026-12-02')).toBeNull();
		expect(duration_before('', '2026-11-10')).toBeNull();
		expect(duration_before('2026-12-01', '')).toBeNull();
	});

	it('computes the date from a lead', () => {
		expect(date_before('2026-12-01', '3w')).toBe('2026-11-10');
		expect(date_before('2026-12-31', '1m')).toBe('2026-11-30');
		expect(date_before('2026-12-01', 'x')).toBeNull();
	});
});
