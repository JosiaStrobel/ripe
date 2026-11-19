/** Hold time for "press and hold" (ms); also drives the CSS fill transition. */
export const HOLD_MS = 500;
/** Pointer movement that cancels a hold, e.g. when scrolling (px). */
const MOVE_TOLERANCE_PX = 10;
/** A "contextmenu" this soon after a touch press is a long press, not a right click (ms). */
const TOUCH_CONTEXT_WINDOW_MS = 2000;
/** Time of the last touch/pen press on any tap-hold element (shared across elements). */
let last_touch_down_ms = 0;
/** Class set while the element is being held. */
const HOLDING_CLS = 'ripe-holding';

/** Callbacks of a tap-or-hold element. */
export interface TapHoldHandlers {
	/** Short tap/click with the primary button. */
	tap: (evt: MouseEvent) => void;
	/** Held long enough with the primary button or a finger. */
	hold: () => void;
	/** Right click (desktop). */
	secondary: (evt: MouseEvent) => void;
}

/**
 * Make `el` react to tap, press-and-hold and right click.
 * Listeners live on `el` and vanish with it when the view redraws.
 */
export function attach_tap_hold(el: HTMLElement, handlers: TapHoldHandlers): void {
	el.setCssProps({ '--ripe-hold-ms': `${HOLD_MS}ms` });
	let timer: number | null = null;
	let start_x = 0;
	let start_y = 0;
	let held = false;
	// Set on pointerdown on this element; a click without it began elsewhere, e.g. on a
	// block that vanished after a hold and left this one under the finger.
	let pressed = false;

	const cancel = (): void => {
		if (timer !== null) window.clearTimeout(timer);
		timer = null;
		el.removeClass(HOLDING_CLS);
	};

	el.addEventListener('pointerdown', (evt) => {
		if (evt.pointerType !== 'mouse') last_touch_down_ms = Date.now();
		if (evt.button !== 0) return;
		held = false;
		pressed = true;
		start_x = evt.clientX;
		start_y = evt.clientY;
		el.addClass(HOLDING_CLS);
		timer = window.setTimeout(() => {
			cancel();
			held = true;
			handlers.hold();
		}, HOLD_MS);
	});
	el.addEventListener('pointermove', (evt) => {
		if (timer === null) return;
		const moved = Math.hypot(evt.clientX - start_x, evt.clientY - start_y);
		if (moved > MOVE_TOLERANCE_PX) cancel();
	});
	for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
		el.addEventListener(type, cancel);
	}
	// "click" fires only for the primary button and taps (not auxclick); after a hold
	// the trailing click must not open the menu.
	el.addEventListener('click', (evt) => {
		const own_press = pressed;
		pressed = false;
		if (held) {
			held = false;
			evt.stopPropagation();
			return;
		}
		// detail 0: keyboard activation, which has no pointerdown.
		if (!own_press && evt.detail !== 0) return;
		handlers.tap(evt);
	});
	// Touch long press also raises "contextmenu", possibly on the block that moved under
	// the finger after a hold; only a real right click opens the menu.
	el.addEventListener('contextmenu', (evt) => {
		evt.preventDefault();
		if (Date.now() - last_touch_down_ms < TOUCH_CONTEXT_WINDOW_MS) return;
		handlers.secondary(evt);
	});
}
