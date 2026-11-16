import { t } from '../i18n';
import { day_to_parts, type Day } from '../parser/date';

/** Short localized date, e.g. "24.11." or "11/24". */
export function short_date(day: Day): string {
	const { month, day: dom } = day_to_parts(day);
	return t('date.short', { day: dom, month });
}
