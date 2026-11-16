/**
 * Inline fields in Dataview style: `[key:: value]`.
 * Values may contain wiki links (`[log:: [[Note]]]`), so brackets are matched by depth.
 * Editing functions only touch the field in question; all other text stays as it is.
 */

/** One inline field with its position in the line. */
export interface InlineField {
	/** Key as written (trimmed). */
	key: string;
	/** Value as written (trimmed). */
	value: string;
	/** Index of the opening "[". */
	start: number;
	/** Index after the closing "]". */
	end: number;
}

const KEY = /^\s*([^\s[\]:][^[\]:]*?)\s*::/;

/** Normalized key for comparison (trim, lower case). */
export function normalize_key(key: string): string {
	return key.trim().toLowerCase();
}

/** Index after the "]" matching the "[" at `start`, or -1 if unbalanced. */
function matching_bracket_end(text: string, start: number): number {
	let depth = 0;
	for (let i = start; i < text.length; i++) {
		if (text[i] === '[') depth++;
		else if (text[i] === ']' && --depth === 0) return i + 1;
	}
	return -1;
}

/** Find all top-level `[key:: value]` fields in a line. Wiki links are skipped. */
export function parse_fields(line: string): InlineField[] {
	const fields: InlineField[] = [];
	let i = 0;
	while ((i = line.indexOf('[', i)) !== -1) {
		const end = matching_bracket_end(line, i);
		if (end === -1) break;
		const inner = line.slice(i + 1, end - 1);
		const key = KEY.exec(inner);
		if (key && !inner.startsWith('[')) {
			const value = inner.slice(key[0].length).trim();
			fields.push({ key: (key[1] ?? '').trim(), value, start: i, end });
		}
		i = end;
	}
	return fields;
}

/** First field with the given key (case-insensitive), or undefined. */
export function find_field(line: string, key: string): InlineField | undefined {
	const wanted = normalize_key(key);
	return parse_fields(line).find((field) => normalize_key(field.key) === wanted);
}

/** Set a field's value in place; append `[key:: value]` at the end if missing. */
export function set_field(line: string, key: string, value: string): string {
	const field = find_field(line, key);
	if (field) return `${line.slice(0, field.start)}[${field.key}:: ${value}]${line.slice(field.end)}`;
	return `${line.trimEnd()} [${key}:: ${value}]`;
}

/** Remove a field together with one adjacent space; unchanged if missing. */
export function remove_field(line: string, key: string): string {
	const field = find_field(line, key);
	if (!field) return line;
	const before = line.slice(0, field.start);
	const after = line.slice(field.end);
	if (before.endsWith(' ')) return before.slice(0, -1) + after;
	return before + (after.startsWith(' ') ? after.slice(1) : after);
}

/** Line text with all fields removed and whitespace collapsed. */
export function strip_fields(line: string): string {
	let result = '';
	let last = 0;
	for (const field of parse_fields(line)) {
		result += line.slice(last, field.start);
		last = field.end;
	}
	return (result + line.slice(last)).replace(/\s+/g, ' ').trim();
}

/** Target of the first wiki link in a text (`[[Note|Alias]]` → "Note"), or null. */
export function wiki_link_target(text: string): string | null {
	const match = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/.exec(text);
	return match?.[1]?.trim() ?? null;
}
