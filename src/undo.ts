import { Notice } from 'obsidian';
import { t } from './i18n';
import type { TodoStore } from './store';

const UNDO_NOTICE_MS = 8000;

/** A line change that can be reverted. */
interface Change {
	line_no: number;
	before: string;
	after: string;
}

/** One-step undo for completing or skipping a task. */
export class UndoManager {
	private last: Change | null = null;
	private notice: Notice | null = null;

	/** Create the manager for a store; `on_change` redraws after an undo. */
	constructor(
		private readonly store: TodoStore,
		private readonly on_change: () => void,
	) {}

	/** True if there is a change to undo. */
	get can_undo(): boolean {
		return this.last !== null;
	}

	/** Remember a change and offer to undo it in a notice. */
	record(line_no: number, before: string, after: string, message: string): void {
		this.last = { line_no, before, after };
		this.notice?.hide();
		const fragment = createFragment((f) => {
			f.createSpan({ text: message });
			const button = f.createEl('button', { cls: 'ripe-undo-button', text: t('action.undo') });
			button.addEventListener('click', (evt) => {
				evt.stopPropagation();
				void this.undo();
			});
		});
		this.notice = new Notice(fragment, UNDO_NOTICE_MS);
	}

	/** Restore the line, but only if it still has the text the change left. */
	async undo(): Promise<void> {
		const change = this.last;
		this.last = null;
		this.notice?.hide();
		this.notice = null;
		if (!change) return;
		try {
			const ok = await this.store.replace_line_text(change.line_no, change.after, change.before);
			if (!ok) new Notice(t('notice.undo_failed'));
		} catch (error) {
			console.error('Ripe: undo failed', error);
			new Notice(t('notice.write_failed'));
		}
		this.on_change();
	}
}
