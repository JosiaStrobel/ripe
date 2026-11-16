import { t } from '../i18n';
import { format_date, type Day } from '../parser/date';

const MIN_OFFSET_DAYS = -14;
const MAX_OFFSET_DAYS = 30;

/**
 * Test tool: a slider that shifts the day the overview is computed for. Only the display
 * is simulated; actions still write the real date. Shown only if enabled in the settings.
 */
export class TimeSlider {
	/** Simulated offset from today (days). */
	offset = 0;
	private readonly root: HTMLElement;
	private readonly input: HTMLInputElement;
	private readonly label: HTMLElement;

	/** Build the (initially hidden) slider into `parent`; `on_change` redraws. */
	constructor(parent: HTMLElement, on_change: () => void) {
		this.root = parent.createDiv({ cls: 'ripe-time-slider' });
		this.label = this.root.createDiv({ cls: 'ripe-time-slider-label' });
		const row = this.root.createDiv({ cls: 'ripe-time-slider-row' });
		this.input = row.createEl('input', {
			attr: { type: 'range', min: String(MIN_OFFSET_DAYS), max: String(MAX_OFFSET_DAYS), step: '1' },
		});
		this.input.value = '0';
		const reset = row.createEl('button', { text: t('slider.reset') });
		this.input.addEventListener('input', () => {
			this.offset = Number(this.input.value);
			on_change();
		});
		reset.addEventListener('click', () => {
			this.offset = 0;
			this.input.value = '0';
			on_change();
		});
		this.root.hide();
	}

	/** Show or hide the slider; hiding resets the offset. */
	set_visible(visible: boolean): void {
		this.root.toggle(visible);
		if (!visible && this.offset !== 0) {
			this.offset = 0;
			this.input.value = '0';
		}
	}

	/** Update the label for the real today. */
	update_label(real_today: Day): void {
		const day = format_date(real_today + this.offset);
		const sign = this.offset > 0 ? '+' : '';
		this.label.setText(
			this.offset === 0
				? t('slider.today', { date: day })
				: t('slider.simulated', { date: day, offset: `${sign}${this.offset}` }),
		);
		this.root.toggleClass('is-simulated', this.offset !== 0);
	}
}
