/**
 * Shared folder for generated AI helper files (same convention as the MOC Tree plugin):
 * `<aiFolder>/<plugin-id>/…`, default `.ai-context`. Dot folders stay hidden in Obsidian.
 */

/** Default AI folder, relative to the vault root. */
export const DEFAULT_AI_FOLDER = '.ai-context';

/** Clean a folder path: trimmed, `/` separators, no empty or `.` segments, no leading or trailing `/`. */
export function clean_folder_path(path: string): string {
	return path
		.trim()
		.replace(/\\/g, '/')
		.split('/')
		.filter((segment) => segment !== '' && segment !== '.')
		.join('/');
}

/** True if any segment starts with a dot (Obsidian neither shows nor indexes such paths). */
export function is_hidden_path(path: string): boolean {
	return clean_folder_path(path)
		.split('/')
		.some((segment) => segment.startsWith('.'));
}

/** Problem with an AI folder: empty (vault root), or a helper file would replace a user file. */
export type AiFolderIssue = 'empty' | 'conflict';

/**
 * Check an AI folder; null if usable. Ripe evaluates no folders, only single files, so a visible
 * folder is fine as long as no helper file path (`files`, relative to the folder) hits a user file.
 */
export function ai_folder_issue(
	folder: string,
	files: readonly string[],
	user_files: readonly string[],
): AiFolderIssue | null {
	const clean = clean_folder_path(folder);
	if (clean === '') return 'empty';
	const targets = files.map((file) => `${clean}/${file}`.toLowerCase());
	if (user_files.some((file) => targets.includes(clean_folder_path(file).toLowerCase()))) return 'conflict';
	return null;
}
