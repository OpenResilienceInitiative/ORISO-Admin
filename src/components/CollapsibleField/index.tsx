import { useLayoutEffect, useRef, type ReactNode } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

export interface CollapsibleFieldProps {
    /** Field label shown in the collapsed pill ("✓ E-Mail") and used in its accessible name. */
    label: string;
    /** Replaces `label` in the pill; select fields show their value, which the label alone would hide. */
    pillText?: string;
    /** The pill cannot expand (a disabled placeholder field). */
    disabled?: boolean;
    /** Marks the slot so a parent can tell which field received focus (`data-field-key`). */
    fieldKey?: string;
    /** Collapsed = the pill replaces the field. The caller decides (valid + blurred). */
    collapsed: boolean;
    /** Pill click: the caller flips `collapsed` back to false. */
    onExpand: () => void;
    /** The current value, read out with the pill and shown as its tooltip — the pill hides it visually. */
    valueSummary?: string;
    /** The full field. Its first `input` (else first button) gets focus after expanding; caret at the end. */
    children: ReactNode;
    className?: string;
}

const WIDTH_TRANSITION = 'width 200ms cubic-bezier(0.2, 0, 0, 1)';

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Nearest ancestor that scrolls horizontally (the invite row's scroller). */
const horizontalScroller = (element: HTMLElement): HTMLElement | null => {
    let node = element.parentElement;
    while (node) {
        const { overflowX } = window.getComputedStyle(node);
        if (overflowX === 'auto' || overflowX === 'scroll') return node;
        node = node.parentElement;
    }
    return null;
};

// Shrinking pills keep the row's `scrollLeft`, so filled pills slide out on the left
// and look deleted. Give the scroll back as far as the focused control stays visible.
const settleRowScroll = (slot: HTMLElement) => {
    const scroller = horizontalScroller(slot);
    if (!scroller || scroller.scrollLeft === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const scrollerRect = scroller.getBoundingClientRect();
    let target = 0;
    if (active && scroller.contains(active)) {
        // Keep the focused control's right edge inside the visible band.
        const activeRight = active.getBoundingClientRect().right - scrollerRect.left + scroller.scrollLeft;
        target = Math.max(0, activeRight - scroller.clientWidth + 8);
    }
    if (target < scroller.scrollLeft) scroller.scrollLeft = target;
};

const CheckGlyph = () => (
    <svg className={styles.check} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M7.1 12.3 3.6 8.8l1-1 2.5 2.5 5.3-5.3 1 1z" fill="currentColor" />
    </svg>
);

// A valid, blurred field collapses to a "✓ Label" pill so a full row fits a phone.
// The width animates via measured FLIP, since `auto` widths cannot be transitioned.
export const CollapsibleField = ({
    label,
    collapsed,
    onExpand,
    valueSummary,
    pillText,
    disabled = false,
    fieldKey,
    children,
    className,
}: CollapsibleFieldProps) => {
    const { t } = useTranslation();
    const slotRef = useRef<HTMLDivElement>(null);
    const lastWidth = useRef<number | undefined>(undefined);
    const lastCollapsed = useRef(collapsed);

    useLayoutEffect(() => {
        const slot = slotRef.current;
        if (!slot) return undefined;
        const clearInline = () => {
            slot.style.width = '';
            slot.style.overflow = '';
            slot.style.transition = '';
        };
        // A toggle during a running animation: measure the NATURAL width, not the frozen inline one.
        clearInline();
        const to = slot.getBoundingClientRect().width;
        const from = lastWidth.current;
        const toggled = lastCollapsed.current !== collapsed;
        lastWidth.current = to;
        lastCollapsed.current = collapsed;
        if (!toggled) return undefined;

        if (!collapsed) {
            // Expanded by a pill click: hand the caret back where typing continues.
            const input = slot.querySelector('input');
            if (input) {
                input.focus();
                const end = input.value.length;
                try {
                    input.setSelectionRange(end, end);
                } catch {
                    // Input types without a selection API keep the browser's caret.
                }
            } else {
                slot.querySelector<HTMLElement>('button:not([disabled])')?.focus();
            }
        }

        if (from === undefined || from === to || to === 0 || prefersReducedMotion()) {
            settleRowScroll(slot);
            return undefined;
        }

        slot.style.width = `${from}px`;
        slot.style.overflow = 'hidden';
        // Force the start width to be laid out before the transition target is set.
        slot.getBoundingClientRect();
        slot.style.transition = WIDTH_TRANSITION;
        slot.style.width = `${to}px`;
        const finish = () => {
            clearInline();
            settleRowScroll(slot);
        };
        slot.addEventListener('transitionend', finish, { once: true });
        const fallback = window.setTimeout(finish, 320);
        return () => {
            window.clearTimeout(fallback);
            slot.removeEventListener('transitionend', finish);
            clearInline();
        };
    }, [collapsed]);

    return (
        <div
            ref={slotRef}
            className={classNames(styles.slot, className)}
            data-collapsed={collapsed || undefined}
            data-field-key={fieldKey}
        >
            {collapsed && (
                <button
                    aria-label={
                        valueSummary
                            ? t('collapsibleField.editWithValue', '{{label}} bearbeiten: {{value}}', {
                                  label,
                                  value: valueSummary,
                              })
                            : t('collapsibleField.edit', '{{label}} bearbeiten', { label })
                    }
                    className={styles.pill}
                    disabled={disabled}
                    title={valueSummary}
                    type="button"
                    onClick={onExpand}
                >
                    <CheckGlyph />
                    <span className={styles.label}>{pillText ?? label}</span>
                </button>
            )}
            {/* Hidden, not unmounted: input refs, caret and open requests must survive. */}
            <div style={{ display: collapsed ? 'none' : 'contents' }}>{children}</div>
        </div>
    );
};

export default CollapsibleField;
