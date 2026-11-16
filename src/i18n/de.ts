import type { Messages } from './en';

/** German UI texts. */
const de: Messages = {
	'command.open_overview': 'Übersicht öffnen',
	'view.title': 'Ripe',
	'view.empty': 'Gerade gibt es nichts zu tun.',
	'view.untitled': '(ohne Titel)',
	'view.overdue': '+{days} T',
	'view.missing_file': 'Todo-Datei „{path}“ nicht gefunden.',
	'view.create_file': 'Datei anlegen',
	'action.done': 'Erledigt',
	'action.skip': 'Überspringen',
	'action.open_note': 'Notiz öffnen',
	'action.show_line': 'In Todo-Datei zeigen',
	'error.missing_field': 'Feld fehlt: {field}',
	'error.invalid_value': 'Ungültiger Wert: {field}',
	'error.conflicting_kinds': 'Felder mehrerer Aufgabentypen',
	'notice.line_changed': 'Die Zeile wurde inzwischen geändert, nichts gespeichert.',
	'notice.write_failed': 'Änderung konnte nicht gespeichert werden.',
	'settings.todo_file.name': 'Todo-Datei',
	'settings.todo_file.desc': 'Notiz mit einer Aufgabe pro Zeile.',
	'settings.importance.name': 'Standard-Wichtigkeit',
	'settings.importance.desc': 'Für Aufgaben ohne „wichtig“.',
	'settings.importance.low': 'Niedrig',
	'settings.importance.normal': 'Normal',
	'settings.importance.high': 'Hoch',
	'settings.curve.name': 'Dringlichkeits-Kurve',
	'settings.curve.desc': '1 = linear; höhere Werte steigen erst langsam, dann schnell.',
};

export default de;
