import { describe, expect, it } from 'vitest';
import { parse_date } from './date';
import { parse_todo, parse_todo_lines, type ParseOptions, type Todo } from './todo';

const OPTIONS: ParseOptions = { default_importance: 2 };

/** Parse a line that must be a task. */
function parse(line: string): Todo {
	const todo = parse_todo(line, OPTIONS);
	if (!todo) throw new Error(`not a task: ${line}`);
	return todo;
}

describe('parse_todo_lines', () => {
	it('returns task lines with line numbers and strips CR', () => {
		const entries = parse_todo_lines('# Todos\r\n- [ ] A\r\n\r\n- [x] B', OPTIONS);
		expect(entries.map((e) => [e.line_no, e.todo.raw])).toEqual([
			[1, '- [ ] A'],
			[3, '- [x] B'],
		]);
	});
});

describe('parse_todo', () => {
	it('ignores non-task lines', () => {
		expect(parse_todo('# Todos', OPTIONS)).toBeNull();
		expect(parse_todo('- Butter', OPTIONS)).toBeNull();
	});

	it('parses a recurring task (after completion)', () => {
		const todo = parse(
			'- [ ] Blumen gießen [alle:: 6d] [toleranz:: 3d] [zuletzt:: 2026-11-12] [wichtig:: 2] [log:: [[Blumen gießen (Log)]]]',
		);
		expect(todo.title).toBe('Blumen gießen');
		expect(todo.log).toBe('Blumen gießen (Log)');
		expect(todo.timing).toEqual({
			kind: 'interval',
			every: { amount: 6, unit: 'd' },
			tolerance: { amount: 3, unit: 'd' },
			last_done: parse_date('2026-11-12'),
		});
		expect(todo.errors).toEqual([]);
	});

	it('requires a tolerance for interval tasks', () => {
		const todo = parse('- [ ] Gießen [alle:: 6d]');
		expect(todo.timing.kind).toBe('none');
		expect(todo.errors).toEqual([{ code: 'missing_field', field: 'toleranz' }]);
	});

	it('parses a calendar task', () => {
		const todo = parse('- [ ] Müll rausbringen [jeden:: dienstag] [zuletzt:: 2026-11-11]');
		expect(todo.timing).toMatchObject({ kind: 'calendar', schedule: { kind: 'weekly', weekdays: [2] } });
		expect(todo.importance).toBe(2);
	});

	it('parses a deadline task with note link and accepts "faellig"', () => {
		const todo = parse(
			'- [ ] Flug buchen [faellig:: 2026-12-01] [vorlauf:: 3w] [puffer:: 1w] [wichtig:: 3] [[Lissabon-Reise]]',
		);
		expect(todo.title).toBe('Flug buchen');
		expect(todo.note).toBe('Lissabon-Reise');
		expect(todo.importance).toBe(3);
		expect(todo.timing).toEqual({
			kind: 'deadline',
			due: parse_date('2026-12-01'),
			lead: { amount: 3, unit: 'w' },
			buffer: { amount: 1, unit: 'w' },
		});
	});

	it('parses an aging task', () => {
		const todo = parse('- [ ] Anna zurückschreiben [erstellt:: 2026-11-16] [kritisch_nach:: 5d]');
		expect(todo.timing).toEqual({
			kind: 'aging',
			created: parse_date('2026-11-16'),
			critical_after: { amount: 5, unit: 'd' },
		});
	});

	it('reports invalid values and conflicting kinds', () => {
		const todo = parse('- [ ] X [fällig:: bald] [kritisch_nach:: 5d] [wichtig:: 7]');
		expect(todo.timing.kind).toBe('none');
		expect(todo.importance).toBe(2);
		expect(todo.errors).toContainEqual({ code: 'conflicting_kinds' });
		expect(todo.errors).toContainEqual({ code: 'invalid_value', field: 'wichtig' });
	});

	it('reads done state, completion date and snooze', () => {
		const todo = parse('  * [x] Erledigt [erledigt:: 2026-11-16] [pausiert_bis:: 2026-11-20]');
		expect(todo.done).toBe(true);
		expect(todo.done_on).toBe(parse_date('2026-11-16'));
		expect(todo.paused_until).toBe(parse_date('2026-11-20'));
		expect(todo.timing.kind).toBe('none');
	});

	it('keeps the raw line and unknown fields untouched', () => {
		const line = '- [ ] Etwas [eigenes:: feld] [alle:: 1w] [toleranz:: 2d]';
		const todo = parse(line);
		expect(todo.raw).toBe(line);
		expect(todo.title).toBe('Etwas');
	});
});
