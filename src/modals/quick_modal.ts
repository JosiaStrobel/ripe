import { type App, Modal, type TextComponent } from 'obsidian';
import type { TaskDraft } from '../draft';
import { t } from '../i18n';
import { today } from '../parser/date';
import { parse_quick, type QuickResult } from '../quick_capture';
import { QUICK_DURATIONS } from '../settings';

/** Options for the quick capture dialog. */
export interface QuickModalOptions {
	fallback_duration: string;
	importance: number;
	on_submit: (draft: TaskDraft) => Promise<void>;
}

/** Quick capture: one text field, shortcuts at the end, duration buttons for touch. */
export class QuickModal extends Modal {
	private text = '';
	/** Duration chosen by button; null = setting default. */
	private chosen: string | null = null;
	private input: TextComponent | null = null;
	private preview_el: HTMLElement | null = null;
	private buttons = new Map<string, HTMLButtonElement>();
	private add_button: HTMLButtonElement | null = null;

	/** Create the dialog. */
	constructor(
		app: App,
		private readonly options: QuickModalOptions,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(t('modal.quick_title'));
		this.modalEl.addClass('ripe-quick-modal');
		this.scope.register([], 'Enter', (evt) => {
			evt.preventDefault();
			void this.submit();
			return false;
		});
		const el = this.contentEl;

		const input_el = el.createEl('input', {
			cls: 'ripe-quick-input',
			attr: { type: 'text', placeholder: t('modal.quick_placeholder'), enterkeyhint: 'done' },
		});
		input_el.addEventListener('input', () => {
			this.text = input_el.value;
			this.update();
		});
		window.setTimeout(() => input_el.focus(), 0);

		const row = el.createDiv({ cls: 'ripe-quick-durations' });
		for (const duration of QUICK_DURATIONS) {
			const button = row.createEl('button', { text: duration });
			button.addEventListener('click', () => {
				this.chosen = this.chosen === duration ? null : duration;
				this.update();
				input_el.focus();
			});
			this.buttons.set(duration, button);
		}

		this.preview_el = el.createDiv({ cls: 'ripe-quick-preview' });
		el.createDiv({ cls: 'ripe-quick-hint', text: t('modal.quick_hint') });

		const actions = el.createDiv({ cls: 'modal-button-container' });
		actions.createEl('button', { text: t('modal.cancel') }).addEventListener('click', () => this.close());
		this.add_button = actions.createEl('button', { cls: 'mod-cta', text: t('modal.add') });
		this.add_button.addEventListener('click', () => void this.submit());
		this.update();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	/** Current parse result. */
	private result(): QuickResult {
		const fallback = this.chosen ?? this.options.fallback_duration;
		return parse_quick(this.text, today(), fallback, this.options.importance);
	}

	/** Refresh button states and the preview line. */
	private update(): void {
		const { draft, shortcut } = this.result();
		const active = shortcut ? null : (this.chosen ?? this.options.fallback_duration);
		for (const [duration, button] of this.buttons) {
			button.toggleClass('mod-cta', duration === active);
			button.toggleClass('ripe-muted', shortcut);
		}
		this.preview_el?.setText(draft.title ? describe(draft) : '');
		if (this.add_button) this.add_button.disabled = !draft.title;
	}

	/** Add the task and close. */
	private async submit(): Promise<void> {
		const { draft } = this.result();
		if (!draft.title) return;
		await this.options.on_submit(draft);
		this.close();
	}
}

/** One-line description of what will be created. */
function describe(draft: TaskDraft): string {
	const v = draft.values;
	switch (draft.kind) {
		case 'aging':
			return `${draft.title} · ${t('preview.aging', { duration: v.critical_after ?? '' })}`;
		case 'deadline':
			return `${draft.title} · ${t('preview.deadline', { date: v.due ?? '' })}`;
		case 'interval':
			return `${draft.title} · ${t('preview.interval', { every: v.every ?? '', tolerance: v.tolerance ?? '' })}`;
		case 'calendar':
			return `${draft.title} · ${t('preview.calendar', { schedule: v.schedule ?? '' })}`;
		case 'none':
			return draft.title;
	}
}
