import { free_links } from './parser/fields';

/**
 * Pure helpers for the detail note link of a task: the first wiki link outside of
 * fields (see parse_todo). Only that link changes; the rest of the line stays.
 */

/** Set the note link: replace the first free wiki link, or append one. */
export function set_note_link(line: string, link_text: string): string {
	const link = `[[${link_text}]]`;
	const current = free_links(line)[0];
	if (current) return line.slice(0, current.start) + link + line.slice(current.end);
	return `${line.trimEnd()} ${link}`;
}

/** Remove the note link together with one adjacent space; unchanged without link. */
export function remove_note_link(line: string): string {
	const current = free_links(line)[0];
	if (!current) return line;
	const before = line.slice(0, current.start);
	const after = line.slice(current.end);
	if (before.endsWith(' ')) return before.slice(0, -1) + after;
	return before + (after.startsWith(' ') ? after.slice(1) : after);
}

const MAX_NAME_LENGTH = 100;

/** File name for a new note from a task title; null if nothing usable is left. */
export function note_name(title: string): string | null {
	const name = title
		.replace(/[\\/:*?"<>|#^[\]]/g, ' ')
		.replace(/\s+/g, ' ')
		.replace(/^[.\s]+/, '')
		.trim()
		.slice(0, MAX_NAME_LENGTH)
		.trim();
	return name.length > 0 ? name : null;
}

/** First name not taken: "Name", "Name 1", "Name 2", … */
export function unique_name(name: string, taken: (candidate: string) => boolean): string {
	if (!taken(name)) return name;
	for (let i = 1; ; i++) {
		const candidate = `${name} ${i}`;
		if (!taken(candidate)) return candidate;
	}
}

/** Display data of a note for searching: frontmatter `title` and `aliases`, if present. */
export interface NoteLabel {
	title: string | null;
	aliases: string[];
}

/** Read `title` and `aliases` (list or single string) from frontmatter; ignores other types. */
export function note_label(frontmatter: unknown): NoteLabel {
	if (typeof frontmatter !== 'object' || frontmatter === null) return { title: null, aliases: [] };
	const data = frontmatter as Record<string, unknown>;
	const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : null;
	const raw = Array.isArray(data.aliases) ? data.aliases : [data.aliases];
	const aliases = raw
		.filter((a): a is string => typeof a === 'string' && a.trim() !== '')
		.map((a) => a.trim())
		.filter((a) => a !== title);
	return { title, aliases };
}
