import { debounce, getIcon, ItemView, setIcon, type ViewStateResult, type WorkspaceLeaf } from 'obsidian';
import { t } from '../i18n';
import { today, type Day } from '../parser/date';
import type { PluginSettings } from '../settings';
import type { TodoStore } from '../store';
import { compare_urgency, compute_urgency, hidden_info } from '../urgency';
import { render_grid_layout } from './grid_layout';
import { render_matrix_layout } from './matrix_layout';
import { TaskActions, type TaskServices } from './task_actions';
import type { TaskRow } from './task_block';
import { TimeSlider } from './time_slider';

export const OVERVIEW_VIEW_TYPE = 'ripe-overview';

/** Layouts of the overview; stored per view in the workspace. */
export type OverviewLayout = 'grid' | 'matrix';
const LAYOUTS: readonly OverviewLayout[] = ['grid', 'matrix'];

/**
 * Icon candidates of the toggle button (shows the layout you switch to); the first one
 * that exists in Obsidian's icon set is used, since names differ between versions.
 */
const TOGGLE_ICONS: Readonly<Record<OverviewLayout, readonly string[]>> = {
	grid: ['chart-scatter', 'scatter-chart', 'grid-2x2', 'layout-dashboard'],
	matrix: ['layout-grid', 'grid', 'layout-dashboard'],
};

/** First available icon of the candidates (last one as fallback). */
function pick_icon(candidates: readonly string[]): string {
	return candidates.find((id) => getIcon(id) !== null) ?? candidates[candidates.length - 1] ?? 'grid';
}

/** Open tasks that are not visible on `day`, sorted by the day they appear. */
function hidden_tasks(rows: readonly TaskRow[], day: Day): TaskRow[] {
	const hidden: TaskRow[] = [];
	for (const row of rows) {
		const info = hidden_info(row.entry.todo, day);
		if (info) hidden.push({ ...row, hidden: info });
	}
	return hidden.sort((a, b) => (a.hidden?.until ?? 0) - (b.hidden?.until ?? 0));
}

/** Services the overview uses. */
export interface OverviewDeps extends TaskServices {
	get_settings: () => PluginSettings;
}

/** Overview of all visible tasks: color grid or urgency/importance matrix. */
export class OverviewView extends ItemView {
	/** Incremented per render, so a slower older render does not overwrite a newer one. */
	private render_id = 0;
	private layout: OverviewLayout = 'grid';
	/** Hidden-tasks section expanded; starts collapsed with each opened view. */
	private hidden_open = false;
	private readonly store: TodoStore;
	private readonly actions: TaskActions;
	private readonly toggle_el: HTMLElement;
	private readonly slider: TimeSlider;
	/** Re-rendered part below the (persistent) time slider. */
	private readonly body_el: HTMLElement;

	/** Create the view for a leaf. */
	constructor(
		leaf: WorkspaceLeaf,
		private readonly deps: OverviewDeps,
	) {
		super(leaf);
		this.store = deps.store;
		this.actions = new TaskActions(this.app, deps, () => this.render());
		this.toggle_el = this.addAction(pick_icon(TOGGLE_ICONS.grid), t('command.toggle_layout'), () =>
			this.toggle_layout(),
		);
		this.addAction('plus', t('command.add_task'), () => deps.editor.add());
		this.addAction('zap', t('command.quick_add'), () => deps.editor.quick());
		this.slider = new TimeSlider(this.contentEl, () => void this.render());
		this.body_el = this.contentEl.createDiv({ cls: 'ripe-overview-body' });
	}

	getViewType(): string {
		return OVERVIEW_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t('view.title');
	}

	getIcon(): string {
		return 'apple';
	}

	getState(): Record<string, unknown> {
		return { ...super.getState(), layout: this.layout };
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		const layout = typeof state === 'object' && state !== null ? (state as { layout?: unknown }).layout : null;
		this.layout = LAYOUTS.find((l) => l === layout) ?? this.layout;
		this.update_toggle();
		await super.setState(state, result);
		await this.render();
	}

	async onOpen(): Promise<void> {
		this.contentEl.addClass('ripe-overview');
		// The matrix positions depend on the width.
		const on_resize = debounce(() => {
			if (this.layout === 'matrix') void this.render();
		}, 200);
		this.registerEvent(this.app.workspace.on('resize', on_resize));
		await this.render();
	}

	/** Switch between grid and matrix; the choice is saved with the workspace. */
	async toggle_layout(): Promise<void> {
		this.layout = this.layout === 'grid' ? 'matrix' : 'grid';
		this.update_toggle();
		this.app.workspace.requestSaveLayout();
		await this.render();
	}

	/** Reload the todo file and rebuild the view. */
	async render(): Promise<void> {
		const id = ++this.render_id;
		const entries = await this.store.load();
		if (id !== this.render_id) return;
		const settings = this.deps.get_settings();
		const el = this.body_el;
		el.empty();
		this.contentEl.toggleClass('is-matrix', this.layout === 'matrix');
		this.slider.set_visible(settings.showTimeSlider);
		const real_today = today();
		this.slider.update_label(real_today);
		if (!entries) {
			this.render_missing_file(el);
			return;
		}
		const day = real_today + this.slider.offset;
		const options = { curve_exponent: settings.curveExponent };
		const all: TaskRow[] = entries.map((entry) => ({
			entry,
			urgency: compute_urgency(entry.todo, day, options),
		}));
		const rows = all
			.filter((row) => row.urgency.visible)
			.sort(
				(a, b) =>
					compare_urgency(a.urgency, b.urgency) || b.entry.todo.importance - a.entry.todo.importance,
			);
		const hidden_rows = hidden_tasks(all, day);
		if (rows.length === 0 && (this.layout === 'matrix' || hidden_rows.length === 0)) {
			el.createDiv({ cls: 'ripe-empty', text: t('view.empty') });
			return;
		}
		if (this.layout === 'matrix') {
			render_matrix_layout(el, rows, this.actions, { today: day, range_days: settings.matrixRangeDays });
		} else {
			render_grid_layout(el, rows, this.actions, {
				rows: hidden_rows,
				open: this.hidden_open,
				on_toggle: (open) => (this.hidden_open = open),
			});
		}
	}

	/** Toggle button shows the layout it switches to. */
	private update_toggle(): void {
		setIcon(this.toggle_el, pick_icon(TOGGLE_ICONS[this.layout]));
	}

	/** Hint and create button when the todo file does not exist. */
	private render_missing_file(el: HTMLElement): void {
		const box = el.createDiv({ cls: 'ripe-empty' });
		box.createDiv({ text: t('view.missing_file', { path: this.store.path }) });
		const button = box.createEl('button', { cls: 'mod-cta', text: t('view.create_file') });
		button.addEventListener('click', () => void this.create_file());
	}

	/** Create the missing todo file and redraw. */
	private async create_file(): Promise<void> {
		await this.store.create_file();
		await this.render();
	}
}
