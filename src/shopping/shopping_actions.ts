import { Notice } from 'obsidian';
import { t } from '../i18n';
import type { LineChange } from '../line_changes';
import type { UndoManager } from '../undo';
import { finish_changes, find_item, insert_item, new_item_line, state_change } from './actions';
import { move_in_order } from './order';
import type { ItemState, ShoppingCategory, ShoppingItem } from './parser';
import type { ShoppingStore } from './store';

/** Writes shopping changes to the file, with notices and undo. */
export class ShoppingActions {
	/** Create the actions; `on_change` redraws after a write. */
	constructor(
		readonly store: ShoppingStore,
		private readonly undo: UndoManager,
		private readonly on_change: () => void,
	) {}

	/** Move an item to another state (catalog, list, checked). */
	async set_state(item: ShoppingItem, state: ItemState): Promise<void> {
		const change = state_change(item, state);
		if (change) await this.write([change]);
	}

	/** "Shopping done": checked items back to the catalog with their count raised; undoable. */
	async finish(categories: readonly ShoppingCategory[]): Promise<void> {
		const changes = finish_changes(categories);
		if (changes.length === 0) return;
		if (await this.write(changes)) {
			this.undo.record(this.store, changes, t('notice.shopping_done', { count: changes.length }));
		}
	}

	/** Put an item on the list: a known item is reused, a new one goes to the end of its category. */
	async add(name: string, category: string): Promise<void> {
		try {
			const existing = find_item((await this.store.load()) ?? [], name);
			if (existing) {
				if (existing.state !== 'listed') await this.set_state(existing, 'listed');
				new Notice(t('notice.item_listed', { name: existing.name }));
				return;
			}
			await this.store.process((content) => insert_item(content, category, new_item_line(name)));
		} catch (error) {
			console.error('Ripe: failed to add shopping item', error);
			new Notice(t('notice.write_failed'));
		}
		this.on_change();
	}

	/** Move a category one place up (-1) or down (+1) in the store order (frontmatter only). */
	async move(name: string, direction: -1 | 1): Promise<void> {
		try {
			const categories = (await this.store.load()) ?? [];
			const names = categories.filter((c) => c.line_no !== null).map((c) => c.name);
			const order = move_in_order(names, name, direction);
			if (order) await this.store.save_order(order);
		} catch (error) {
			console.error('Ripe: failed to save category order', error);
			new Notice(t('notice.write_failed'));
		}
		this.on_change();
	}

	/** Apply line changes; tells the user if a line changed meanwhile. */
	private async write(changes: LineChange[]): Promise<boolean> {
		let ok = false;
		try {
			ok = await this.store.replace_lines(changes);
			if (!ok) new Notice(t('notice.line_changed'));
		} catch (error) {
			console.error('Ripe: failed to update shopping list', error);
			new Notice(t('notice.write_failed'));
		}
		this.on_change();
		return ok;
	}
}
