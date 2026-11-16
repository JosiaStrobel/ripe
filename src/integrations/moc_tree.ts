import type { App, TFile } from 'obsidian';

/**
 * Optional integration with the MOC Tree plugin (same author). Ripe never requires it:
 * without an enabled MOC Tree that offers API version 1, callers fall back to Ripe's own
 * behavior. See MOC Tree `src/api.ts` for the contract.
 */

const PLUGIN_ID = 'moc-tree';
const SUPPORTED_VERSION = 1;

/** Subset of MOC Tree's public API (version 1) that Ripe uses. */
export interface MocTreeApi {
	version: number;
	create_note(title: string, options?: { interactive?: boolean; open?: boolean }): Promise<TFile | null>;
}

/** `app.plugins` exists at runtime but is not part of the official typings. */
interface AppWithPlugins {
	plugins?: { getPlugin(id: string): unknown };
}

/** True for plain objects. */
function is_record(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/** MOC Tree's API if the plugin is enabled and compatible, else null. */
export function moc_tree_api(app: App): MocTreeApi | null {
	const plugin = (app as unknown as AppWithPlugins).plugins?.getPlugin(PLUGIN_ID);
	if (!is_record(plugin) || !is_record(plugin.api)) return null;
	const api = plugin.api;
	if (api.version !== SUPPORTED_VERSION || typeof api.create_note !== 'function') return null;
	return api as unknown as MocTreeApi;
}
