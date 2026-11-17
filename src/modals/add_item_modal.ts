import { type App, Modal } from 'obsidian';
import { t } from '../i18n';

/** Value of the "new category" option (cannot clash with a heading, those are trimmed). */
const NEW_CATEGORY = ' new';

/** Options for the add item dialog. */
export interface AddItemOptions {
	/** Existing categories in store order ("" = items above the first heading). */
	categories: readonly string[];
	/** Preselected category. */
	category: string;
	on_submit: (name: string, category: string) => Promise<void>;
}

/** Dialog for a new shopping item: name and category (existing or new). */
export class AddItemModal extends Modal {
	/** Create the dialog. */
	constructor(
		app: App,
		private readonly options: AddItemOptions,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(t('modal.add_item_title'));
		this.modalEl.addClass('ripe-quick-modal');
		const el = this.contentEl;

		const name_el = el.createEl('input', {
			cls: 'ripe-quick-input',
			attr: { type: 'text', placeholder: t('modal.item_name'), enterkeyhint: 'done' },
		});
		window.setTimeout(() => name_el.focus(), 0);

		const row = el.createDiv({ cls: 'ripe-item-category' });
		row.createSpan({ cls: 'ripe-modal-top-label', text: t('modal.category') });
		const select = row.createEl('select', { cls: 'dropdown' });
		for (const name of this.options.categories) {
			select.createEl('option', { value: name, text: name || t('shop.uncategorized') });
		}
		select.createEl('option', { value: NEW_CATEGORY, text: t('modal.new_category') });
		select.value = this.options.categories.includes(this.options.category)
			? this.options.category
			: (this.options.categories[0] ?? NEW_CATEGORY);
		const new_el = el.createEl('input', {
			cls: 'ripe-quick-input',
			attr: { type: 'text', placeholder: t('modal.category_name'), enterkeyhint: 'done' },
		});

		const actions = el.createDiv({ cls: 'modal-button-container' });
		actions.createEl('button', { text: t('modal.cancel') }).addEventListener('click', () => this.close());
		const add = actions.createEl('button', { cls: 'mod-cta', text: t('modal.add') });

		const category = (): string => (select.value === NEW_CATEGORY ? new_el.value.trim() : select.value);
		const update = (): void => {
			new_el.toggleClass('ripe-hidden', select.value !== NEW_CATEGORY);
			add.disabled = !name_el.value.trim() || (select.value === NEW_CATEGORY && !category());
		};
		const submit = async (): Promise<void> => {
			if (add.disabled) return;
			await this.options.on_submit(name_el.value.trim(), category());
			this.close();
		};
		name_el.addEventListener('input', update);
		new_el.addEventListener('input', update);
		select.addEventListener('change', () => {
			update();
			if (select.value === NEW_CATEGORY) new_el.focus();
		});
		add.addEventListener('click', () => void submit());
		this.scope.register([], 'Enter', (evt) => {
			evt.preventDefault();
			void submit();
			return false;
		});
		update();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
