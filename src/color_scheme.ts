import { COLOR_SCHEMES, type ColorScheme } from './settings';

const PREFIX = 'ripe-scheme-';

/** Apply the color gradient as body class (read by styles.css); removes the others. */
export function apply_color_scheme(scheme: ColorScheme | null): void {
	for (const name of COLOR_SCHEMES) document.body.removeClass(PREFIX + name);
	if (scheme) document.body.addClass(PREFIX + scheme);
}
