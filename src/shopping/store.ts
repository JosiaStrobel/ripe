import { type App, getFrontMatterInfo, parseYaml } from 'obsidian';
import type { PluginSettings } from '../settings';
import { VaultFile } from '../vault_file';
import { order_categories, read_order } from './order';
import { ORDER_KEY, parse_shopping, type ShoppingCategory } from './parser';

/** Parsed frontmatter of a file's content; null if there is none or it is invalid YAML. */
function read_frontmatter(content: string): unknown {
	const info = getFrontMatterInfo(content);
	if (!info.exists) return null;
	try {
		return parseYaml(info.frontmatter) as unknown;
	} catch (error) {
		console.error('Ripe: invalid frontmatter in shopping file', error);
		return null;
	}
}

/** Reads and changes the shopping file through the vault API. */
export class ShoppingStore extends VaultFile {
	/** Create a store that reads the current settings on every access. */
	constructor(app: App, get_settings: () => PluginSettings) {
		super(app, () => get_settings().shoppingFile);
	}

	/** Categories in store order with their items; null if the file does not exist. */
	async load(): Promise<ShoppingCategory[] | null> {
		const content = await this.read();
		if (content === null) return null;
		return order_categories(parse_shopping(content), read_order(read_frontmatter(content)));
	}

	/** Store the category order in the frontmatter; only that key changes. */
	async save_order(order: readonly string[]): Promise<void> {
		const file = await this.create_file();
		await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			frontmatter[ORDER_KEY] = [...order];
		});
	}
}
