import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './scopeChip.module.scss';

export type ScopeKind = 'tenant' | 'agency';

export interface ScopeChipProps {
    kind: ScopeKind;
    id: number | string;
    name: string;
    postcode?: string;
    city?: string;
    /** Full postal address for the card. */
    address?: string;
    /** Makes the chip a button, e.g. "only show this Träger". */
    onClick?: () => void;
}

const CLOSE_DELAY_MS = 150;

export const SCOPE_FALLBACKS = {
    tenant: { short: 'Träger', idLabel: 'Träger-ID' },
    agency: { short: 'BST', idLabel: 'BST-ID' },
} as const;

/**
 * Grey chip: kind + ID, postcode and city (the name when there is no place). Hover or focus opens a card with the
 * full name, address and ID; the pointer can move onto the card, Escape closes it (WCAG 1.4.13).
 */
export const ScopeChip = ({ kind, id, name, postcode, city, address, onClick }: ScopeChipProps) => {
    const { t } = useTranslation();
    const cardId = useId();
    const anchorRef = useRef<HTMLElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const cancelClose = () => clearTimeout(closeTimer.current);
    // Fixed, not absolute: the table's scroll container would clip the card.
    const open = () => {
        cancelClose();
        const rect = anchorRef.current?.getBoundingClientRect();
        if (rect) setPosition({ top: rect.bottom + 6, left: rect.left });
    };
    const close = () => {
        cancelClose();
        setPosition(null);
    };
    // Grace period to cross the gap between chip and card.
    const closeSoon = () => {
        cancelClose();
        closeTimer.current = setTimeout(() => setPosition(null), CLOSE_DELAY_MS);
    };

    useEffect(() => cancelClose, []);

    useEffect(() => {
        if (!position) return undefined;
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
        };
        document.addEventListener('keydown', onEscape);
        window.addEventListener('scroll', close, true);
        return () => {
            document.removeEventListener('keydown', onEscape);
            window.removeEventListener('scroll', close, true);
        };
    }, [position]);

    const place = [postcode, city].filter(Boolean).join(' ');
    const chipProps = {
        'data-scope-chip': kind,
        className: styles.chip,
        'aria-describedby': position ? cardId : undefined,
        onMouseEnter: open,
        onMouseLeave: closeSoon,
        onFocus: open,
        onBlur: close,
    };
    const content = (
        <>
            <span className={styles.kind}>
                {t(`userTable.scope.${kind}.short`, SCOPE_FALLBACKS[kind].short)} {id}
            </span>
            {(place || name) && <span className={styles.place}>{place || name}</span>}
        </>
    );

    return (
        <>
            {onClick ? (
                <button type="button" ref={anchorRef as RefObject<HTMLButtonElement>} onClick={onClick} {...chipProps}>
                    {content}
                </button>
            ) : (
                // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the card is the only place the full name and address are shown, so keyboard users must reach it
                <span ref={anchorRef} tabIndex={0} {...chipProps}>
                    {content}
                </span>
            )}
            {position && (
                <span
                    id={cardId}
                    role="tooltip"
                    className={styles.card}
                    style={position}
                    onMouseEnter={cancelClose}
                    onMouseLeave={closeSoon}
                >
                    <span className={styles.cardId}>
                        {t(`userTable.scope.${kind}.idLabel`, SCOPE_FALLBACKS[kind].idLabel)} {id}
                    </span>
                    <strong className={styles.cardName}>{name}</strong>
                    {address && <span className={styles.cardAddress}>{address}</span>}
                </span>
            )}
        </>
    );
};
