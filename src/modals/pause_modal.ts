import { type App, Modal } from 'obsidian';
import { t, type MessageKey } from '../i18n';
import { format_date, parse_date, today, type Day } from '../parser/date';

/** Quick choices: days from today and their label. */
const QUICK_CHOICES: ReadonlyArray<[number, MessageKey]> = [
	[1, 'pause.tomorrow'],
	[3, 'pause.in_3_days'],
	[7, 'pause.in_1_week'],
	[14, 'pause.in_2_weeks'],
];

/** Asks until when a task is paused (the day it shows up again). */
export class PauseModal extends Modal {
	/** Create the dialog; `on_choose` receives the chosen day. */
	constructor(
		app: App,
		private readonly on_choose: (until: Day) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(t('pause.title'));
		this.modalEl.addClass('ripe-pause-modal');
		const now = today();

		const quick = this.contentEl.createDiv({ cls: 'ripe-pause-choices' });
		for (const [days, label] of QUICK_CHOICES) {
			const button = quick.createEl('button', { text: t(label) });
			button.addEventListener('click', () => this.choose(now + days));
		}

		const row = this.contentEl.createDiv({ cls: 'ripe-pause-date' });
		row.createSpan({ text: t('pause.date') });
		const input = row.createEl('input', { attr: { type: 'date', min: format_date(now + 1) } });
		input.value = format_date(now + 7);
		const ok = row.createEl('button', { cls: 'mod-cta', text: t('pause.confirm') });
		ok.addEventListener('click', () => {
			const day = parse_date(input.value);
			if (day !== null && day > now) this.choose(day);
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}

	/** Hand over the day and close. */
	private choose(day: Day): void {
		this.close();
		this.on_choose(day);
	}
}
