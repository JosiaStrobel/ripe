/** Soft hyphen: invisible, shows "-" only where the browser breaks the word. */
export const SOFT_HYPHEN = '­';
/** Words from this length (characters) get break opportunities. */
const MIN_WORD_LENGTH = 12;
/** Characters kept together at the start and end of a word. */
const EDGE_LENGTH = 3;

/** True if `text` has a word long enough for `soft_hyphenate` to change it. */
export function has_long_word(text: string): boolean {
	return text.split(/\s+/).some((word) => Array.from(word).length >= MIN_WORD_LENGTH);
}

/**
 * Insert soft hyphens into long words so they break with a visible hyphen.
 * Not syllable-aware; the browser picks the last break that fits.
 */
export function soft_hyphenate(text: string): string {
	return text
		.split(/(\s+)/)
		.map((part) => (Array.from(part).length >= MIN_WORD_LENGTH ? hyphenate_word(part) : part))
		.join('');
}

/** Put a soft hyphen between all letters of a word, except near its edges and existing dashes. */
function hyphenate_word(word: string): string {
	const chars = Array.from(word);
	let result = chars[0] ?? '';
	for (let i = 1; i < chars.length; i++) {
		const prev = chars[i - 1] ?? '';
		const cur = chars[i] ?? '';
		const inner = i >= EDGE_LENGTH && i <= chars.length - EDGE_LENGTH;
		if (inner && /\p{L}/u.test(prev) && /\p{L}/u.test(cur)) result += SOFT_HYPHEN;
		result += cur;
	}
	return result;
}
