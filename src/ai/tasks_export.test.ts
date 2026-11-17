import { describe, expect, it } from 'vitest';
import { parse_date } from '../parser/date';
import { parse_todo_lines } from '../parser/todo';
import { render_tasks_export, type TasksExportContext } from './tasks_export';

const CTX: TasksExportContext = { todo_file: 'Todos.md', curve_exponent: 1 };
const TODAY = parse_date('2026-11-17') ?? 0;

/** Render the export for the given file content. */
function render(content: string): string {
	return render_tasks_export(parse_todo_lines(content, { default_importance: 2 }), TODAY, CTX);
}

/** Table row of the task with the given title. */
function row(output: string, title: string): string {
	return output.split('\n').find((line) => line.startsWith('|') && line.includes(` ${title} `)) ?? '';
}

describe('render_tasks_export', () => {
	const content = [
		'# Todos',
		'- [ ] Blumen gießen [alle:: 6d] [toleranz:: 3d] [zuletzt:: 2026-11-05] [wichtig:: 3]',
		'- [ ] Flug buchen [fällig:: 2026-12-01] [vorlauf:: 3w] [[Lissabon]]',
		'- [ ] Steuer [fällig:: 2027-05-31] [vorlauf:: 2m]',
		'- [ ] Rad ölen',
		'- [ ] Pause [erstellt:: 2026-11-01] [kritisch_nach:: 5d] [pausiert_bis:: 2026-11-20]',
		'- [x] Fertig [erledigt:: 2026-11-10]',
		'- [ ] Kaputt | Zeile [alle:: 6d]',
	].join('\n');
	const output = render(content);

	it('starts with an explanation and the hint not to edit', () => {
		expect(output.startsWith('# Ripe tasks\n')).toBe(true);
		expect(output).toContain('never edit this file');
		expect(output).toContain('## State on 2026-11-17');
	});

	it('lists visible tasks most urgent first with 1-based line numbers', () => {
		const visible = output.slice(output.indexOf('### Visible'), output.indexOf('### Hidden'));
		expect(visible.indexOf('Blumen gießen')).toBeLessThan(visible.indexOf('Flug buchen'));
		expect(row(output, 'Blumen gießen')).toBe('| 2 | Blumen gießen | 3 critical | 3 | 2026-11-14 |');
		expect(row(output, 'Flug buchen (note: Lissabon)')).toBe(
			'| 3 | Flug buchen (note: Lissabon) | 1 rising |  | 2026-12-01 |',
		);
		expect(row(output, 'Rad ölen')).toContain('| – |');
	});

	it('lists hidden tasks with the reason and paused ones', () => {
		expect(row(output, 'Steuer')).toBe('| 4 | Steuer | 2027-03-31 | not yet due |');
		expect(row(output, 'Pause')).toBe('| 6 | Pause | 2026-11-20 | paused |');
		expect(output).not.toContain('Fertig');
	});

	it('escapes pipes and lists problems', () => {
		expect(output).toContain('Kaputt \\| Zeile');
		expect(output).toContain('missing `toleranz`');
	});

	it('does not use checkbox syntax in the generated file', () => {
		expect(output).not.toMatch(/^\s*- \[.\]/m);
	});

	it('is stable for unchanged input and mentions a missing file', () => {
		expect(render(content)).toBe(output);
		expect(render(content.replace(/\n/g, '\r\n'))).toBe(output);
		expect(output).not.toContain('\r');
		expect(render_tasks_export(null, TODAY, CTX)).toContain('does not exist yet');
	});
});
