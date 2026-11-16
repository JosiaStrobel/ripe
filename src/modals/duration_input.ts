import { setIcon } from 'obsidian';
import { t } from '../i18n';
import { format_duration, parse_duration, type DurationUnit } from '../parser/duration';

const UNITS: readonly DurationUnit[] = ['d', 'w', 'm'];

/**
 * Touch-friendly duration input: −/+ buttons, a number field (opens the numeric keypad)
 * and a unit select. Emits the stored text form ("6d"), or "" when the number is empty.
 */
export class DurationInput {
	private readonly number_el: HTMLInputElement;
	private readonly unit_el: HTMLSelectElement;

	/** Build the input into `container` with an initial value like "6d". */
	constructor(
		container: HTMLElement,
		value: string,
		private readonly on_change: (value: string) => void,
	) {
		const root = container.createDiv({ cls: 'ripe-duration' });
		const minus = root.createEl('button', { cls: 'ripe-step', attr: { 'aria-label': '−1' } });
		setIcon(minus, 'minus');
		this.number_el = root.createEl('input', {
			cls: 'ripe-duration-number',
			attr: { type: 'number', inputmode: 'numeric', min: '0', step: '1' },
		});
		const plus = root.createEl('button', { cls: 'ripe-step', attr: { 'aria-label': '+1' } });
		setIcon(plus, 'plus');
		this.unit_el = root.createEl('select', { cls: 'dropdown' });
		for (const unit of UNITS) this.unit_el.createEl('option', { value: unit, text: t(`unit.${unit}`) });

		minus.addEventListener('click', () => this.step(-1));
		plus.addEventListener('click', () => this.step(1));
		this.number_el.addEventListener('input', () => this.emit());
		this.unit_el.addEventListener('change', () => this.emit());
		this.setValue(value);
	}

	/** Show a value like "6d" without emitting a change; invalid text shows as empty. */
	setValue(value: string): void {
		const duration = parse_duration(value);
		this.number_el.value = duration ? String(duration.amount) : '';
		this.unit_el.value = duration?.unit ?? 'd';
	}

	/** Change the number by `delta` (not below 0) and emit. */
	private step(delta: number): void {
		const current = Number.parseInt(this.number_el.value, 10);
		this.number_el.value = String(Math.max(0, (Number.isNaN(current) ? 0 : current) + delta));
		this.emit();
	}

	/** Report the current value in stored form. */
	private emit(): void {
		const amount = Number.parseInt(this.number_el.value, 10);
		const unit = UNITS.find((u) => u === this.unit_el.value) ?? 'd';
		this.on_change(Number.isNaN(amount) || amount < 0 ? '' : format_duration({ amount, unit }));
	}
}
