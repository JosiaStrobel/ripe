import { describe, expect, it } from 'vitest';
import { complete_line, pause_line, replace_line, skip_line, unpause_line } from './actions';
import { parse_date } from './parser/date';
import { parse_todo, type Todo } from './parser/todo';

const TODAY = parse_date('2026-11-16') ?? 0;

/** Parse a task line; fails the test if it is not one. */
function todo(line: string): Todo {
	const result = parse_todo(line, { default_importance: 2 });
	if (!result) throw new Error(`not a task: ${line}`);
	return result;
}

describe('complete_line', () => {
	it('updates zuletzt for recurring tasks', () => {
		expect(complete_line(todo('- [ ] A [alle:: 6d] [toleranz:: 3d] [zuletzt:: 2026-11-01]'), TODAY)).toBe(
			'- [ ] A [alle:: 6d] [toleranz:: 3d] [zuletzt:: 2026-11-16]',
		);
		expect(complete_line(todo('- [ ] Müll [jeden:: di]'), TODAY)).toBe(
			'- [ ] Müll [jeden:: di] [zuletzt:: 2026-11-16]',
		);
	});

	it('checks one-time tasks and records the date', () => {
		expect(complete_line(todo('  * [ ] Flug [fällig:: 2026-12-01] [[Reise]]'), TODAY)).toBe(
			'  * [x] Flug [fällig:: 2026-12-01] [[Reise]] [erledigt:: 2026-11-16]',
		);
	});

	it('skips recurring tasks like completing them', () => {
		expect(skip_line(todo('- [ ] Müll [jeden:: di]'), TODAY)).toBe(
			'- [ ] Müll [jeden:: di] [zuletzt:: 2026-11-16]',
		);
	});
});

describe('replace_line', () => {
	const content = '# Todos\n- [ ] A\n- [ ] B\n';

	it('replaces the expected line', () => {
		expect(replace_line(content, 1, '- [ ] A', '- [x] A')).toBe('# Todos\n- [x] A\n- [ ] B\n');
	});

	it('finds a moved line by its text', () => {
		expect(replace_line(content, 0, '- [ ] B', '- [x] B')).toBe('# Todos\n- [ ] A\n- [x] B\n');
	});

	it('refuses changed or ambiguous lines', () => {
		expect(replace_line(content, 1, '- [ ] C', '- [x] C')).toBeNull();
		expect(replace_line('- [ ] A\n- [ ] A', 5, '- [ ] A', 'x')).toBeNull();
	});

	it('keeps CRLF line endings', () => {
		expect(replace_line('- [ ] A\r\n- [ ] B\r\n', 0, '- [ ] A', '- [x] A')).toBe(
			'- [x] A\r\n- [ ] B\r\n',
		);
	});
});

describe('pause', () => {
	it('sets and replaces the snooze date', () => {
		const line = '- [ ] Anna [erstellt:: 2026-11-10] [kritisch_nach:: 5d]';
		const paused = pause_line(todo(line), TODAY + 4);
		expect(paused).toBe(`${line} [pausiert_bis:: 2026-11-20]`);
		expect(pause_line(todo(paused), TODAY + 1)).toBe(`${line} [pausiert_bis:: 2026-11-17]`);
	});

	it('removes the snooze date', () => {
		expect(unpause_line(todo('- [ ] A [pausiert_bis:: 2026-11-20] [wichtig:: 3]'))).toBe('- [ ] A [wichtig:: 3]');
	});
});
