import { useMemo, useRef } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

export interface DpaTocItem {
    id: string;
    text: string;
    level: number;
}

export interface DpaLegalTextProps {
    /** Sanitized HTML of the published legal text (host applies DOMPurify). */
    html: string;
    /** Accessible name of the text region. */
    label: string;
    /**
     * Which element scrolls the text:
     * - `inner` — the region itself is a capped scroll box (onboarding step),
     * - `container` — an ancestor scrolls (the DPA blocker overlay, #572
     *   scroll acceptance: no nested scrollbars there).
     */
    scrollMode?: 'inner' | 'container';
    testId?: string;
}

const HEADING_SELECTOR = 'h1, h2, h3, h4';

/**
 * Parses the section headings out of the legal HTML and assigns generated
 * anchor ids (always overwritten — content-supplied ids are never trusted).
 * Headings become focus targets (`tabindex="-1"`) so a TOC jump moves
 * keyboard focus along with the scroll position.
 */
export const buildAnchoredLegalHtml = (html: string): { html: string; toc: DpaTocItem[] } => {
    if (!html || typeof DOMParser === 'undefined') {
        return { html, toc: [] };
    }
    const doc = new DOMParser().parseFromString(`<div id="dpa-legal-root">${html}</div>`, 'text/html');
    const root = doc.getElementById('dpa-legal-root');
    if (!root) {
        return { html, toc: [] };
    }
    const toc: DpaTocItem[] = [];
    root.querySelectorAll(HEADING_SELECTOR).forEach((heading, index) => {
        const text = heading.textContent?.trim() ?? '';
        if (!text) return;
        const id = `dpa-section-${index + 1}`;
        heading.setAttribute('id', id);
        heading.setAttribute('tabindex', '-1');
        toc.push({ id, text, level: Number(heading.tagName.charAt(1)) || 2 });
    });
    return { html: root.innerHTML, toc };
};

/**
 * Shared read-only legal-text region (DPA/AVV) with in-document anchor
 * navigation (#571/#572 addendum): long legal texts get a TOC generated from
 * their section headings — side placement on wide containers, a compact
 * jump-to-section dropdown on narrow ones (390x844). Jumps smooth-scroll
 * INSIDE the scrollable text region and move keyboard focus to the target
 * section. Used by both the U8 onboarding DPA step and the U10 blocker.
 */
export const DpaLegalText = ({ html, label, scrollMode = 'inner', testId = 'dpa-text' }: DpaLegalTextProps) => {
    const { t } = useTranslation();
    const regionRef = useRef<HTMLDivElement>(null);

    const { html: anchoredHtml, toc } = useMemo(() => buildAnchoredLegalHtml(html), [html]);
    const hasToc = toc.length > 1;

    const jumpTo = (id: string) => {
        const region = regionRef.current;
        const target = region?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        if (!region || !target) return;

        const behavior: ScrollBehavior = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
            ? 'auto'
            : 'smooth';
        if (scrollMode === 'inner') {
            // Scroll INSIDE the capped text region, not the page.
            const regionRect = region.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            region.scrollTo?.({ top: region.scrollTop + (targetRect.top - regionRect.top) - 8, behavior });
        } else {
            // The nearest scrollable ancestor (the blocker overlay) scrolls.
            target.scrollIntoView?.({ behavior, block: 'start' });
        }
        // Focus follows the jump (keyboard accessibility).
        target.focus({ preventScroll: true });
    };

    return (
        <div className={styles.legalContainer}>
            <div className={classNames(styles.legalLayout, { [styles.withToc]: hasToc })}>
                {hasToc && (
                    <>
                        <nav className={styles.tocSide} aria-label={t('dpaToc.label')} data-testid="dpa-toc">
                            <p className={styles.tocTitle} aria-hidden="true">
                                {t('dpaToc.label')}
                            </p>
                            <ul className={styles.tocList}>
                                {toc.map((item) => (
                                    <li key={item.id} data-level={item.level}>
                                        <button
                                            type="button"
                                            className={styles.tocLink}
                                            onClick={() => jumpTo(item.id)}
                                        >
                                            {item.text}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                        <div className={styles.tocCompact}>
                            <select
                                className={styles.tocSelect}
                                aria-label={t('dpaToc.label')}
                                value=""
                                data-testid="dpa-toc-select"
                                onChange={(event) => {
                                    if (event.target.value) {
                                        jumpTo(event.target.value);
                                    }
                                }}
                            >
                                <option value="">{t('dpaToc.jump')}</option>
                                {toc.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.text}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </>
                )}
                <div
                    ref={regionRef}
                    className={classNames(styles.dpaText, { [styles.dpaTextInner]: scrollMode === 'inner' })}
                    data-testid={testId}
                    // Scrollable text region: axe (scrollable-region-focusable)
                    // requires keyboard focusability so the text can be
                    // scrolled without a pointer.
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                    tabIndex={0}
                    role="region"
                    aria-label={label}
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: anchoredHtml }}
                />
            </div>
        </div>
    );
};
