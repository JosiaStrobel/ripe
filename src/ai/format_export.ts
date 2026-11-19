import { FIELD } from '../parser/todo';
import { ORDER_KEY, SHOPPING_FIELD } from '../shopping/parser';

/** Path of the generated file inside the shared AI folder; one subfolder per plugin. */
export const FORMAT_EXPORT_NAME = 'ripe/format.md';

/** Settings the explanation needs. */
export interface FormatExportContext {
	/** Vault path of the todo file. */
	todo_file: string;
	/** Vault path of the shopping list file. */
	shopping_file: string;
	default_importance: number;
}

/** Inline code span that survives backticks in the text. */
function code(text: string): string {
	return text.includes('`') ? `\`\` ${text} \`\`` : `\`${text}\``;
}

/** Text safe for one table cell. */
function cell(text: string): string {
	return text.replace(/\|/g, '\\|');
}

/** Markdown table from a header and rows. */
function table(header: readonly string[], rows: readonly string[][]): string[] {
	return [
		`| ${header.join(' | ')} |`,
		`|${header.map(() => '---').join('|')}|`,
		...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
	];
}

/** Section about the todo file: line format, fields, urgency model, how to change lines. */
function render_todos(ctx: FormatExportContext): string[] {
	const f = code;
	return [
		`## Tasks: ${code(ctx.todo_file)}`,
		'',
		'One task per line with inline fields; other lines (headings, text) are ignored. Field names are',
		'German. Dates are `YYYY-MM-DD`; durations are a number plus `d` (days), `w` (weeks) or `m`',
		'(calendar months).',
		'',
		'```markdown',
		`- [ ] Blumen gießen [${FIELD.every}:: 6d] [${FIELD.tolerance}:: 3d] [${FIELD.last_done}:: 2026-11-12] [${FIELD.importance}:: 2]`,
		`- [ ] Müll rausbringen [${FIELD.schedule}:: dienstag] [${FIELD.lead}:: 1d] [${FIELD.last_done}:: 2026-11-11]`,
		`- [ ] Flug buchen [${FIELD.due}:: 2026-12-01] [${FIELD.lead}:: 3w] [${FIELD.buffer}:: 1w] [${FIELD.importance}:: 3] [[Lissabon-Reise]]`,
		`- [ ] Anna zurückschreiben [${FIELD.created}:: 2026-11-16] [${FIELD.critical_after}:: 5d]`,
		'- [ ] Irgendwann Fahrrad ölen',
		`- [x] Paket abholen [${FIELD.due}:: 2026-11-10] [${FIELD.done}:: 2026-11-09]`,
		'```',
		'',
		'A task is hidden before its start day and fully urgent (red) from its critical day on; in',
		'between the urgency rises (green → yellow → orange → red). The fields present decide the kind;',
		'a line may have only one of `alle`, `jeden`, `fällig`, `kritisch_nach`.',
		'',
		...table(
			['Kind', 'Fields', 'Start (visible from)', 'Critical (red from)'],
			[
				[
					'recurring after completion',
					`${f(FIELD.every)}, ${f(FIELD.tolerance)} (required), ${f(FIELD.last_done)}`,
					`${FIELD.last_done} + ${FIELD.every}; never done: at once`,
					`start + ${FIELD.tolerance}`,
				],
				[
					'recurring by calendar',
					`${f(FIELD.schedule)}, optional ${f(FIELD.lead)}, ${f(FIELD.last_done)}`,
					`next date − ${FIELD.lead}`,
					'next date',
				],
				[
					'deadline',
					`${f(FIELD.due)}, optional ${f(FIELD.lead)}, ${f(FIELD.buffer)}`,
					`${FIELD.due} − ${FIELD.lead}`,
					`${FIELD.due} − ${FIELD.buffer}`,
				],
				[
					'aging (no deadline)',
					`${f(FIELD.created)}, ${f(FIELD.critical_after)}`,
					FIELD.created,
					`${FIELD.created} + ${FIELD.critical_after}`,
				],
				['no timing', 'none of the above', 'always visible', 'never'],
			],
		),
		'',
		`- ${f(FIELD.schedule)}: weekdays (\`dienstag\`, \`mo, do\`, also English names) or \`monatlich 1\``,
		'  (day of month, clamped to the month end). The next date counts from today, or from the day after',
		`  ${FIELD.last_done} + ${FIELD.lead} if done, so completing within the lead counts for the coming date.`,
		`- ${f(FIELD.importance)}: 1–3, default ${ctx.default_importance}; independent of urgency.`,
		`- ${f(FIELD.start_level)}: 1–4, default 1; color level on the first visible day, urgency`,
		'  then rises from there to critical.',
		`- ${f(FIELD.paused_until)}: hidden before that date (snooze).`,
		`- ${f(FIELD.log)}: link to a log note of a recurring task.`,
		'- A `[[link]]` outside the fields points to a detail note with more content; all values stay in',
		'  the line.',
		'',
		'Changing tasks:',
		'',
		'- Add a task as a new line at the end of the file.',
		`- Complete a recurring task: set ${f(FIELD.last_done)} to the completion date. Complete a one-off`,
		`  task: \`[x]\` and ${f(FIELD.done)} with the date; the line stays in the file.`,
		'- Change only the fields in question; keep the other text, links and field order.',
	];
}

/** Section about the shopping list file. */
function render_shopping(ctx: FormatExportContext): string[] {
	const bought = SHOPPING_FIELD.bought;
	return [
		`## Shopping list: ${code(ctx.shopping_file)}`,
		'',
		'Headings are categories; the list style of a top-level item encodes its state. Indented items,',
		'other text and code blocks are not items.',
		'',
		'```markdown',
		'---',
		`${ORDER_KEY}: [Kühlregal, Obst & Gemüse]`,
		'---',
		'## Obst & Gemüse',
		`- Äpfel [${bought}:: 14]`,
		`- [ ] Bananen [${bought}:: 9]`,
		'',
		'## Kühlregal',
		`- [x] Milch [${bought}:: 31]`,
		'```',
		'',
		...table(
			['Line', 'State'],
			[
				['`- Item`', 'in the catalog only'],
				['`- [ ] Item`', 'on the current list'],
				['`- [x] Item`', 'checked off while shopping'],
			],
		),
		'',
		`- ${code(bought)} counts purchases; it rises when a shopping trip is finished.`,
		`- ${code(ORDER_KEY)} in the frontmatter is the store order of the categories; categories not in it`,
		'  follow in file order.',
		'- Put an existing item on the list by changing `- Item` to `- [ ] Item`; add a new item as',
		'  `- [ ] Item` at the end of its category.',
	];
}

/**
 * Explanation of Ripe's file formats for AI tools. Depends only on the plugin version and the
 * settings, never on the tasks, so it is deterministic and rarely changes (shared via Git).
 */
export function render_format_export(ctx: FormatExportContext): string {
	return [
		'# Ripe file formats',
		'',
		'Generated by the Obsidian plugin Ripe. Do not edit this file; it describes the formats only.',
		'The data are in the files below, the only source of truth; read the current state there.',
		'',
		...render_todos(ctx),
		'',
		...render_shopping(ctx),
		'',
	].join('\n');
}
