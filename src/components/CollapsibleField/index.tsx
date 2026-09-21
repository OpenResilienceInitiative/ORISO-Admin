import { useLayoutEffect, useRef, type ReactNode } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

export interface CollapsibleFieldProps {
    /** Field label shown in the collapsed pill ("✓ E-Mail"). */
    label: string;
    /** Collapsed = the pill replaces the field. The caller decides (valid + blurred). */
    collapsed: boolean;
    /** Pill click: the caller flips `collapsed` back to false. */
    onExpand: () => void;
    /** The current value, read out with the pill and shown as its tooltip — the pill hides it visually. */
    valueSummary?: string;
    /** The full field. Its first `input` gets focus, caret at the end, after expanding. */
    children: ReactNode;
    className?: string;
}

const WIDTH_TRANSITION = 'width 200ms cubic-bezier(0.2, 0, 0, 1)';

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CheckGlyph = () => (
    <svg className={styles.check} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M7.1 12.3 3.6 8.8l1-1 2.5 2.5 5.3-5.3 1 1z" fill="currentColor" />
    </svg>
);

/**
 * Invite-bar field slot (#1026): a filled, valid field collapses to a compact
 * "✓ Label" pill once it loses focus, so a full row fits a phone. Clicking the
 * pill expands the field again and puts the caret at the end of its value.
 * The field itself stays mounted underneath. The width change animates (measured FLIP, since `auto` widths cannot be
 * transitioned) and is instant under `prefers-reduced-motion`.
 */
export const CollapsibleField = ({
    label,
    collapsed,
    onExpand,
    valueSummary,
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
            }
        }

        if (from === undefined || from === to || to === 0 || prefersReducedMotion()) return undefined;

        slot.style.width = `${from}px`;
        slot.style.overflow = 'hidden';
        // Force the start width to be laid out before the transition target is set.
        slot.getBoundingClientRect();
        slot.style.transition = WIDTH_TRANSITION;
        slot.style.width = `${to}px`;
        const done = () => {
            slot.style.width = '';
            slot.style.overflow = '';
            slot.style.transition = '';
        };
        slot.addEventListener('transitionend', done, { once: true });
        const fallback = window.setTimeout(done, 320);
        return () => {
            window.clearTimeout(fallback);
            slot.removeEventListener('transitionend', done);
        };
    }, [collapsed]);

    return (
        <div ref={slotRef} className={classNames(styles.slot, className)} data-collapsed={collapsed || undefined}>
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
                    title={valueSummary}
                    type="button"
                    onClick={onExpand}
                >
                    <CheckGlyph />
                    <span className={styles.label}>{label}</span>
                </button>
            )}
            {/* The field stays MOUNTED while collapsed (only hidden): its element,
                caret state and any open request survive, and whoever holds a
                reference to the input keeps a live one. */}
            <div style={{ display: collapsed ? 'none' : 'contents' }}>{children}</div>
        </div>
    );
};

export default CollapsibleField;
