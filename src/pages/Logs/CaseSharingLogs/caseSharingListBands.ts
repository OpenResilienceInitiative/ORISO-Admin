import type { ListBands } from '../../../hooks/useMeasuredListLayout';

/**
 * Container widths for the case sharing log (docs/responsive-tables.md), measured in Chromium (Playwright,
 * 2026-11-25) on CaseSharingLogs.stories.tsx. The five columns stop overflowing at 815px of list container
 * in de-DE and 865px in en, driven by the one-line time and "before → after" cells; names and usernames
 * wrap. With the longest content (LongContent story, de-DE) the centre column is only 174px wide at 880px
 * and rows grow to 165px; at 960px it is 219px and rows are 145px. So the table is kept from 960px, and
 * rows become cards below that. There is no middle band: no column can fold into another. The stories
 * assert both sides; re-measure when columns change.
 */
export const CASE_SHARING_LIST_BANDS: ListBands = { phoneBelow: 960, wideFrom: 960 };
