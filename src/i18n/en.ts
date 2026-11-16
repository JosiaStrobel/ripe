/** English UI texts; reference for all other languages. Placeholders: {name}. */
const en = {
	'command.open_overview': 'Open overview',
	'view.title': 'Ripe',
	'view.empty': 'Nothing to do right now.',
	'view.untitled': '(untitled)',
	'view.overdue': '+{days} d',
	'view.missing_file': 'Todo file "{path}" not found.',
	'view.create_file': 'Create file',
	'action.done': 'Done',
	'action.skip': 'Skip',
	'action.open_note': 'Open note',
	'action.show_line': 'Show in todo file',
	'error.missing_field': 'Missing field: {field}',
	'error.invalid_value': 'Invalid value: {field}',
	'error.conflicting_kinds': 'Fields of several task types',
	'notice.line_changed': 'The line was changed meanwhile, nothing saved.',
	'notice.write_failed': 'Could not save the change.',
	'settings.todo_file.name': 'Todo file',
	'settings.todo_file.desc': 'Note with one task per line.',
	'settings.importance.name': 'Default importance',
	'settings.importance.desc': 'For tasks without "wichtig".',
	'settings.importance.low': 'Low',
	'settings.importance.normal': 'Normal',
	'settings.importance.high': 'High',
	'settings.curve.name': 'Urgency curve',
	'settings.curve.desc': '1 = linear; higher values rise slowly first, then fast.',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
export default en;
