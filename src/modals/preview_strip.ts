import { t } from '../i18n';
import type { Day } from '../parser/date';
import type { Preview } from '../preview';
import { short_date } from '../views/format';

/** Render the color preview: one box per day; today, critical and due day marked. */
export function render_preview_strip(el: HTMLElement, preview: Preview | null, today: Day): void {
	el.empty();
	if (!preview) return;
	const { window, anchor } = preview;
	const strip = el.createDiv({ cls: 'ripe-preview-strip' });
	for (const { day, level } of preview.days) {
		const box = strip.createDiv({
			cls: ['ripe-preview-day', level === null ? 'ripe-preview-hidden' : `ripe-level-${level}`],
			attr: { title: short_date(day) },
		});
		if (day === today) box.addClass('ripe-preview-today');
		if (day === window.critical) box.addClass('ripe-preview-critical');
		if (day === anchor && anchor !== window.critical) box.addClass('ripe-preview-due');
	}
	const legend = t('preview.legend', {
		start: short_date(window.start),
		critical: short_date(window.critical),
	});
	const due = anchor !== window.critical ? ` · ${t('preview.due', { due: short_date(anchor) })}` : '';
	el.createDiv({ cls: 'ripe-preview-legend', text: legend + due });
}
