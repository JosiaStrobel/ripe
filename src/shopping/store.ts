import type { App } from 'obsidian';
import type { PluginSettings } from '../settings';
import { VaultFile } from '../vault_file';
import { parse_shopping, type ShoppingCategory } from './parser';

/** Reads and changes the shopping file through the vault API. */
export class ShoppingStore extends VaultFile {
	/** Create a store that reads the current settings on every access. */
	constructor(app: App, get_settings: () => PluginSettings) {
		super(app, () => get_settings().shoppingFile);
	}

	/** Categories with their items; null if the file does not exist. */
	async load(): Promise<ShoppingCategory[] | null> {
		const content = await this.read();
		return content === null ? null : parse_shopping(content);
	}
}
