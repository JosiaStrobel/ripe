import { getLanguage } from 'obsidian';
import { has_long_word, soft_hyphenate } from '../hyphenate';

/** Class that disables emergency breaks while measuring (see styles.css). */
const MEASURE_CLS = 'ripe-measure';

/**
 * Render a block title that breaks long words with a hyphen. Uses the browser's
 * syllable hyphenation in the Obsidian language; if a word still overflows (other
 * language, or no dictionary on Linux/Windows desktop), falls back to soft hyphens.
 */
export function render_title(parent: HTMLElement, text: string): HTMLElement {
	const el = parent.createDiv({ cls: 'ripe-block-title', text, attr: { lang: getLanguage() } });
	if (!has_long_word(text)) return el;
	// Measure after layout; a hidden view (width 0) never counts as overflowing.
	window.requestAnimationFrame(() => {
		if (!el.isConnected) return;
		el.addClass(MEASURE_CLS);
		const overflows = el.scrollWidth > el.clientWidth + 1;
		el.removeClass(MEASURE_CLS);
		if (overflows) el.setText(soft_hyphenate(text));
	});
	return el;
}
