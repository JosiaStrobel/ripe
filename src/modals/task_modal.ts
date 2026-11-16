import { type App, type ButtonComponent, Modal, Setting, type TextComponent } from 'obsidian';
import {
	draft_field_for_key,
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

/** Fields entered with the native date picker. */
const DATE_FIELDS: ReadonlySet<DraftField> = new Set(['due', 'created', 'last_done']);

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
	on_submit: (draft: TaskDraft) => Promise<void>;
}

/** Input dialog to create or edit a task. */
export class TaskModal extends Modal {
	private readonly draft: TaskDraft;
	private readonly inputs = new Map<DraftField, TextComponent>();
	private submit_button: ButtonComponent | null = null;
	private status_el: HTMLElement | null = null;
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

		new Setting(el).setName(t('field.title')).addText((text) => {
			text.setValue(this.draft.title).onChange((value) => {
				this.draft.title = value;
				this.update_status();
			});
			text.inputEl.addClass('ripe-title-input');
			window.setTimeout(() => text.inputEl.focus(), 0);
		});

		new Setting(el).setName(t('modal.kind')).addDropdown((dropdown) => {
			for (const kind of KINDS) dropdown.addOption(kind, t(`kind.${kind}`));
			dropdown.setValue(this.draft.kind).onChange((value) => {
				const kind = KINDS.find((k) => k === value);
				if (!kind) return;
				this.draft.kind = kind;
				if (kind === 'aging' && !this.draft.values.created) {
					this.draft.values.created = format_date(today());
				}
				this.render();
			});
		});

		for (const field of KIND_DRAFT_FIELDS[this.draft.kind]) this.render_field(el, field);

		new Setting(el).setName(t('modal.importance')).addDropdown((dropdown) =>
			dropdown
				.addOptions({
					'1': t('settings.importance.low'),
					'2': t('settings.importance.normal'),
					'3': t('settings.importance.high'),
				})
				.setValue(String(this.draft.importance))
				.onChange((value) => (this.draft.importance = Number(value))),
		);

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

	/** One input row for a timing field. */
	private render_field(el: HTMLElement, field: DraftField): void {
		const setting = new Setting(el).setName(t(`field.${field}`));
		if (DESCRIBED_FIELDS.has(field)) setting.setDesc(t(`field.${field}.desc` as MessageKey));
		setting.addText((text) => {
			if (DATE_FIELDS.has(field)) text.inputEl.type = 'date';
			text.setValue(this.draft.values[field] ?? '').onChange((value) => {
				this.draft.values[field] = value;
				if (field === 'tolerance') this.auto_tolerance = value.trim() === '';
				if (field === 'every' && this.auto_tolerance) this.suggest_tolerance(value);
				this.update_status();
			});
			this.inputs.set(field, text);
		});
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
	}

	/** Save the draft if valid and close. */
	private async submit(): Promise<void> {
		if (validate_draft(this.draft, this.options.default_importance).length > 0) return;
		await this.options.on_submit(this.draft);
		this.close();
	}
}

/** Error text with the dialog's field label instead of the stored key. */
function error_text(error: TodoError): string {
	const field = draft_field_for_key(error.field);
	return t(`error.${error.code}`, { field: field ? t(`field.${field}`) : (error.field ?? '') });
}
