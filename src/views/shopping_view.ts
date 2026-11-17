import { ItemView, setIcon, type ViewStateResult, type WorkspaceLeaf } from 'obsidian';
import { t } from '../i18n';
import { AddItemModal } from '../modals/add_item_modal';
import type { ShoppingCategory, ShoppingItem } from '../shopping/parser';
import { plan_sections, shop_sections, type Section } from '../shopping/sections';
import type { ShoppingActions } from '../shopping/shopping_actions';

export const SHOPPING_VIEW_TYPE = 'ripe-shopping';

/** Plan = pick from the catalog; shop = tick off the current list. Stored per view. */
export type ShoppingMode = 'plan' | 'shop';
const MODES: readonly ShoppingMode[] = ['plan', 'shop'];

/** Icon and tooltip of the mode button (shows the mode you switch to). */
const TOGGLE: Readonly<Record<ShoppingMode, { icon: string; label: 'shop.to_shop' | 'shop.to_plan' }>> = {
	plan: { icon: 'shopping-cart', label: 'shop.to_shop' },
	shop: { icon: 'layout-grid', label: 'shop.to_plan' },
};

/** Shopping list with a planning mode (catalog tiles) and a shopping mode (checklist). */
export class ShoppingView extends ItemView {
	/** Incremented per render, so a slower older render does not overwrite a newer one. */
	private render_id = 0;
	private mode: ShoppingMode = 'shop';
	/** Category of the last added item, preselected next time. */
	private last_category = '';
	private categories: ShoppingCategory[] = [];
	private readonly toggle_el: HTMLElement;

	/** Create the view for a leaf. */
	constructor(
		leaf: WorkspaceLeaf,
		private readonly actions: ShoppingActions,
	) {
		super(leaf);
		this.toggle_el = this.addAction(TOGGLE.shop.icon, t(TOGGLE.shop.label), () => this.toggle_mode());
		this.addAction('plus', t('command.add_item'), () => this.add_item());
	}

	getViewType(): string {
		return SHOPPING_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t('shop.title');
	}

	getIcon(): string {
		return 'shopping-cart';
	}

	getState(): Record<string, unknown> {
		return { ...super.getState(), mode: this.mode };
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		const mode = typeof state === 'object' && state !== null ? (state as { mode?: unknown }).mode : null;
		this.mode = MODES.find((m) => m === mode) ?? this.mode;
		this.update_toggle();
		await super.setState(state, result);
		await this.render();
	}

	async onOpen(): Promise<void> {
		this.contentEl.addClass('ripe-shopping');
		await this.render();
	}

	/** Switch between planning and shopping; the choice is saved with the workspace. */
	async toggle_mode(): Promise<void> {
		this.mode = this.mode === 'plan' ? 'shop' : 'plan';
		this.update_toggle();
		this.app.workspace.requestSaveLayout();
		await this.render();
	}

	/** Open the dialog for a new item. */
	add_item(): void {
		new AddItemModal(this.app, {
			categories: this.categories.map((c) => c.name),
			category: this.last_category,
			on_submit: async (name, category) => {
				this.last_category = category;
				await this.actions.add(name, category);
			},
		}).open();
	}

	/** Reload the shopping file and rebuild the view. */
	async render(): Promise<void> {
		const id = ++this.render_id;
		const categories = await this.actions.store.load();
		if (id !== this.render_id) return;
		const el = this.contentEl;
		el.empty();
		el.toggleClass('is-plan', this.mode === 'plan');
		if (!categories) {
			this.render_missing_file(el);
			return;
		}
		this.categories = categories;
		if (this.mode === 'plan') this.render_plan(el, categories);
		else this.render_shop(el, categories);
	}

	/** Catalog as tiles per category; tapping puts an item on the list or takes it off. */
	private render_plan(el: HTMLElement, categories: readonly ShoppingCategory[]): void {
		const count = categories.flatMap((c) => c.items).filter((i) => i.state !== 'catalog').length;
		el.createDiv({ cls: 'ripe-shop-summary', text: t('shop.on_list', { count }) });
		for (const section of plan_sections(categories)) {
			const grid = this.render_section(el, section).createDiv({ cls: 'ripe-shop-tiles' });
			for (const item of section.items) {
				const tile = grid.createEl('button', { cls: 'ripe-shop-tile', text: item.name });
				tile.toggleClass('is-listed', item.state !== 'catalog');
				tile.addEventListener('click', () => {
					void this.actions.set_state(item, item.state === 'catalog' ? 'listed' : 'catalog');
				});
			}
		}
	}

	/** Current list in store order with large checkboxes; checked items at the end. */
	private render_shop(el: HTMLElement, categories: readonly ShoppingCategory[]): void {
		const { open, checked } = shop_sections(categories);
		if (open.length === 0 && checked.length === 0) {
			const box = el.createDiv({ cls: 'ripe-empty' });
			box.createDiv({ text: t('shop.empty') });
			box.createEl('button', { cls: 'mod-cta', text: t('shop.plan') }).addEventListener('click', () => {
				void this.toggle_mode();
			});
			return;
		}
		for (const section of open) {
			const list = this.render_section(el, section).createDiv({ cls: 'ripe-shop-list' });
			for (const item of section.items) this.render_row(list, item);
		}
		if (checked.length > 0) {
			const list = this.render_section(el, { name: t('shop.checked', { count: checked.length }), items: checked });
			const rows = list.createDiv({ cls: 'ripe-shop-list' });
			for (const item of checked) this.render_row(rows, item);
		}
		const finish = el.createEl('button', { cls: 'mod-cta ripe-shop-finish', text: t('shop.finish') });
		finish.disabled = checked.length === 0;
		finish.addEventListener('click', () => void this.actions.finish(categories));
	}

	/** Section container with its heading. */
	private render_section(el: HTMLElement, section: Section): HTMLElement {
		const wrap = el.createDiv({ cls: 'ripe-shop-section' });
		wrap.createDiv({ cls: 'ripe-shop-heading', text: section.name || t('shop.uncategorized') });
		return wrap;
	}

	/** One checklist row; tapping anywhere toggles between listed and checked. */
	private render_row(list: HTMLElement, item: ShoppingItem): void {
		const checked = item.state === 'checked';
		const row = list.createDiv({ cls: 'ripe-shop-row' });
		row.toggleClass('is-checked', checked);
		const box = row.createEl('input', { cls: 'ripe-shop-checkbox', attr: { type: 'checkbox' } });
		box.checked = checked;
		row.createSpan({ cls: 'ripe-shop-name', text: item.name });
		row.addEventListener('click', () => void this.actions.set_state(item, checked ? 'listed' : 'checked'));
	}

	/** Mode button shows the mode it switches to. */
	private update_toggle(): void {
		const toggle = TOGGLE[this.mode];
		setIcon(this.toggle_el, toggle.icon);
		this.toggle_el.setAttribute('aria-label', t(toggle.label));
	}

	/** Hint and create button when the shopping file does not exist. */
	private render_missing_file(el: HTMLElement): void {
		const box = el.createDiv({ cls: 'ripe-empty' });
		box.createDiv({ text: t('shop.missing_file', { path: this.actions.store.path }) });
		const button = box.createEl('button', { cls: 'mod-cta', text: t('view.create_file') });
		button.addEventListener('click', () => void this.create_file());
	}

	/** Create the missing shopping file and redraw. */
	private async create_file(): Promise<void> {
		await this.actions.store.create_file();
		await this.render();
	}
}
