import {
	type App,
	type ButtonComponent,
	DropdownComponent,
	Modal,
	Setting,
	TextComponent,
} from 'obsidian';
import {
	date_before,
	draft_field_for_key,
	draft_timing,
	duration_before,
	half_duration,
	KIND_DRAFT_FIELDS,
	KINDS,
	validate_draft,
	type DraftField,
	type TaskDraft,
} from '../draft';
import { t, type MessageKey } from '../i18n';
import { format_date, today } from '../parser/date';
import type { TodoError } from '../parser/todo';
import { preview_days } from '../preview';
import type { UrgencyOptions } from '../urgency';
import { DurationInput } from './duration_input';
import { render_preview_strip } from './preview_strip';

/** Fields entered with the native date picker. */
const DATE_FIELDS: ReadonlySet<DraftField> = new Set(['due', 'created', 'last_done']);

/** Deadline durations that can also be entered as a date before the due date. */
type DateAlternativeField = 'lead' | 'buffer';
const DATE_ALTERNATIVES: readonly DateAlternativeField[] = ['lead', 'buffer'];

/** Fields entered as number + unit (DurationInput). */
const DURATION_FIELDS: ReadonlySet<DraftField> = new Set([
	'every',
	'tolerance',
	'lead',
	'buffer',
	'critical_after',
]);

/** Common interface of the dialog's inputs for programmatic updates. */
interface ValueInput {
	setValue(value: string): unknown;
}

/** Fields that have a description text. */
const DESCRIBED_FIELDS: ReadonlySet<DraftField> = new Set([
	'every',
	'tolerance',
	'schedule',
	'lead',
	'buffer',
	'critical_after',
]);

/** Options for the task dialog. */
export interface TaskModalOptions {
	heading: string;
	submit_label: string;
	draft: TaskDraft;
	default_importance: number;
	urgency_options: UrgencyOptions;
	on_submit: (draft: TaskDraft) => Promise<void>;
}

/** Input dialog to create or edit a task. */
export class TaskModal extends Modal {
	private readonly draft: TaskDraft;
	private readonly inputs = new Map<DraftField, ValueInput>();
	private submit_button: ButtonComponent | null = null;
	private status_el: HTMLElement | null = null;
	private preview_el: HTMLElement | null = null;
	/** Date inputs next to lead time ("visible from") and buffer ("red from") of deadlines. */
	private readonly date_inputs = new Map<DateAlternativeField, TextComponent>();
	/** True while the tolerance follows the interval automatically. */
	private auto_tolerance: boolean;

	/** Create the dialog; the draft is copied and only submitted on save. */
	constructor(
		app: App,
		private readonly options: TaskModalOptions,
	) {
		super(app);
		this.draft = { ...options.draft, values: { ...options.draft.values } };
		this.auto_tolerance = !this.draft.values.tolerance;
	}

	onOpen(): void {
		this.setTitle(this.options.heading);
		this.modalEl.addClass('ripe-task-modal');
		this.scope.register([], 'Enter', (evt) => {
			evt.preventDefault();
			void this.submit();
			return false;
		});
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	/** Build the form; called again when the kind changes. */
	private render(): void {
		const el = this.contentEl;
		el.empty();
		this.inputs.clear();
		this.date_inputs.clear();

		this.render_top_row(el);

		new Setting(el).setName(t('field.title')).addText((text) => {
			text.setValue(this.draft.title).onChange((value) => {
				this.draft.title = value;
				this.update_status();
			});
			text.inputEl.addClass('ripe-title-input');
			window.setTimeout(() => text.inputEl.focus(), 0);
		});

		for (const field of KIND_DRAFT_FIELDS[this.draft.kind]) this.render_field(el, field);
		this.preview_el = el.createDiv({ cls: 'ripe-preview' });

		this.status_el = el.createDiv({ cls: 'ripe-modal-status' });
		new Setting(el)
			.addButton((button) => button.setButtonText(t('modal.cancel')).onClick(() => this.close()))
			.addButton((button) => {
				this.submit_button = button
					.setButtonText(this.options.submit_label)
					.setCta()
					.onClick(() => void this.submit());
			});
		this.update_status();
	}

	/** Kind and importance side by side in two columns at the top. */
	private render_top_row(el: HTMLElement): void {
		const row = el.createDiv({ cls: 'ripe-modal-top' });

		const kind = new DropdownComponent(labeled_column(row, t('modal.kind')));
		for (const k of KINDS) kind.addOption(k, t(`kind.${k}`));
		kind.setValue(this.draft.kind).onChange((value) => {
			const selected = KINDS.find((k) => k === value);
			if (!selected) return;
			this.draft.kind = selected;
			if (selected === 'aging' && !this.draft.values.created) {
				this.draft.values.created = format_date(today());
			}
			this.render();
		});

		new DropdownComponent(labeled_column(row, t('modal.importance')))
			.addOptions({
				'1': t('settings.importance.low'),
				'2': t('settings.importance.normal'),
				'3': t('settings.importance.high'),
			})
			.setValue(String(this.draft.importance))
			.onChange((value) => (this.draft.importance = Number(value)));
	}

	/** One input row for a timing field. */
	private render_field(el: HTMLElement, field: DraftField): void {
		const setting = new Setting(el).setName(t(`field.${field}`));
		if (DESCRIBED_FIELDS.has(field)) setting.setDesc(t(`field.${field}.desc` as MessageKey));
		const value = this.draft.values[field] ?? '';
		const on_change = (changed: string): void => this.on_field_change(field, changed);
		// Deadline lead/buffer: date alternative above the duration, in the same row.
		const alternative = DATE_ALTERNATIVES.find((f) => f === field);
		if (alternative && this.draft.kind === 'deadline') {
			setting.controlEl.addClass('ripe-stacked-control');
			this.add_date_alternative(setting.controlEl, alternative);
		}
		if (DURATION_FIELDS.has(field)) {
			this.inputs.set(field, new DurationInput(setting.controlEl, value, on_change));
		} else {
			setting.addText((text) => {
				if (DATE_FIELDS.has(field)) text.inputEl.type = 'date';
				text.setValue(value).onChange(on_change);
				this.inputs.set(field, text);
			});
		}
		this.sync_dates();
	}

	/** Store a changed field value and update dependent inputs. */
	private on_field_change(field: DraftField, value: string): void {
		this.draft.values[field] = value;
		if (field === 'tolerance') this.auto_tolerance = value.trim() === '';
		if (field === 'every' && this.auto_tolerance) this.suggest_tolerance(value);
		if (field === 'due' || field === 'lead' || field === 'buffer') this.sync_dates();
		this.update_status();
	}

	/** Labeled date input as alternative to a duration; the duration is computed from it. */
	private add_date_alternative(container: HTMLElement, field: DateAlternativeField): void {
		const row = container.createDiv({ cls: 'ripe-date-alternative' });
		row.createSpan({ cls: 'ripe-date-label', text: t(`field.${field}.date`) });
		const text = new TextComponent(row);
		text.inputEl.type = 'date';
		text.onChange((value) => {
			const duration = duration_before(this.draft.values.due ?? '', value);
			if (duration === null) return;
			this.draft.values[field] = duration;
			this.inputs.get(field)?.setValue(duration);
			this.update_status();
		});
		this.date_inputs.set(field, text);
	}

	/** Show the dates that match the current due date, lead time and buffer. */
	private sync_dates(): void {
		const due = this.draft.values.due ?? '';
		for (const [field, input] of this.date_inputs) {
			input.setValue(date_before(due, this.draft.values[field] ?? '') ?? '');
		}
	}

	/** Fill the tolerance with half the interval while the user has not set one. */
	private suggest_tolerance(every: string): void {
		const tolerance = half_duration(every) ?? '';
		this.draft.values.tolerance = tolerance;
		this.inputs.get('tolerance')?.setValue(tolerance);
	}

	/** Show validation errors and enable the submit button only for valid drafts. */
	private update_status(): void {
		const errors = validate_draft(this.draft, this.options.default_importance);
		this.status_el?.empty();
		// A missing title is obvious; don't show it as an error while typing.
		for (const error of errors.filter((e) => e.field !== 'title')) {
			this.status_el?.createDiv({ cls: 'ripe-error', text: error_text(error) });
		}
		this.submit_button?.setDisabled(errors.length > 0);
		this.update_preview();
	}

	/** Redraw the color preview for the current timing fields. */
	private update_preview(): void {
		if (!this.preview_el) return;
		const day = today();
		const timing = draft_timing(this.draft, this.options.default_importance);
		render_preview_strip(this.preview_el, preview_days(timing, day, this.options.urgency_options), day);
	}

	/** Save the draft if valid and close. */
	private async submit(): Promise<void> {
		if (validate_draft(this.draft, this.options.default_importance).length > 0) return;
		await this.options.on_submit(this.draft);
		this.close();
	}
}

/** Column with a small label above; returns the container for the control. */
function labeled_column(row: HTMLElement, label: string): HTMLElement {
	const column = row.createDiv({ cls: 'ripe-modal-top-column' });
	column.createDiv({ cls: 'ripe-modal-top-label', text: label });
	return column;
}

/** Error text with the dialog's field label instead of the stored key. */
function error_text(error: TodoError): string {
	const field = draft_field_for_key(error.field);
	return t(`error.${error.code}`, { field: field ? t(`field.${field}`) : (error.field ?? '') });
}
