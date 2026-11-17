import { Notice } from 'obsidian';
import { t } from './i18n';
import { invert_changes, type LineChange } from './line_changes';
import type { VaultFile } from './vault_file';

const UNDO_NOTICE_MS = 8000;

/** Line changes in one file that can be reverted together. */
interface Change {
	target: VaultFile;
	changes: LineChange[];
}

/** One-step undo for line changes (completing a task, finishing a shopping trip …). */
export class UndoManager {
	private last: Change | null = null;
	private notice: Notice | null = null;

	/** Create the manager; `on_change` redraws after an undo. */
	constructor(private readonly on_change: () => void) {}

	/** True if there is a change to undo. */
	get can_undo(): boolean {
		return this.last !== null;
	}

	/** Remember applied changes and offer to undo them in a notice. */
	record(target: VaultFile, changes: LineChange[], message: string): void {
		this.last = { target, changes };
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

	/** Restore the lines, but only if they still have the text the change left. */
	async undo(): Promise<void> {
		const change = this.last;
		this.last = null;
		this.notice?.hide();
		this.notice = null;
		if (!change) return;
		try {
			const ok = await change.target.replace_lines(invert_changes(change.changes));
			if (!ok) new Notice(t('notice.undo_failed'));
		} catch (error) {
			console.error('Ripe: undo failed', error);
			new Notice(t('notice.write_failed'));
		}
		this.on_change();
	}
}
