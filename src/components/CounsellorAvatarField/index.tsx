import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import AbcIcon from '@mui/icons-material/Abc';
import { AvatarPickerGrid, type AvatarOption } from '../AvatarPickerGrid';
import { ReactComponent as ArrowIcon } from '../../resources/img/svg/keyboard-arrow-down.svg';
import { ANIMAL_AVATARS } from '../../resources/img/svg/avatars';
import {
    type CounsellorAvatarValue,
    type CounsellorNameParts,
    counsellorInitials,
    normaliseAvatarValue,
} from '../../utils/counsellorAvatar';
import styles from './styles.module.scss';

/**
 * The picker addresses INITIALS and every motif through ONE radiogroup, so the
 * whole choice is a single arrow-key list at 320px. This is the tile id of the
 * initials option; every other id is a motif id.
 */
export const INITIALS_TILE_ID = '__initials__';

/** Tile diameter and grid gap, mirrored from AvatarPickerGrid's stylesheet. */
const TILE_SIZE = 52;
const GRID_GAP = 12;
/** One arrow click travels exactly one row, so the motion is legible. */
export const ROW_STEP = TILE_SIZE + GRID_GAP;
/**
 * Room around the grid inside the scrolling viewport. The selection ring
 * reaches 6px beyond a tile and the focus outline around it 10px (2px at an
 * 8px offset); anything less and an edge tile's indicator is clipped.
 */
export const VIEWPORT_PADDING = 10;
/**
 * The picker shows five rows and scrolls (owner, 2026-09-17): all 61 motifs at
 * once pushed the rest of the form off the screen. The padding is added on top
 * so the five rows stay fully visible (the viewport is border-box).
 */
export const VISIBLE_ROWS = 5;
export const VIEWPORT_HEIGHT = VISIBLE_ROWS * TILE_SIZE + (VISIBLE_ROWS - 1) * GRID_GAP + 2 * VIEWPORT_PADDING;

export interface CounsellorAvatarFieldProps extends CounsellorNameParts {
    value: CounsellorAvatarValue;
    onChange: (value: CounsellorAvatarValue) => void;
    disabled?: boolean;
    className?: string;
}

const toTileId = ({ avatarKind, avatarId }: CounsellorAvatarValue): string | undefined => {
    if (avatarKind === 'ICON' && avatarId) {
        return avatarId;
    }
    // INITIALS is the only other selectable kind today; an unset consultant
    // shows NO selection (the "unset state" #1046 asks for) rather than a
    // pre-checked tile nobody chose.
    return avatarKind === 'INITIALS' ? INITIALS_TILE_ID : undefined;
};

/**
 * Avatar section of the consultant form and of the counsellor onboarding
 * wizard (#1046/#1047): the initials tile plus the platform's monochrome
 * counsellor motifs, all a light glyph on the tenant's saturated brand red.
 *
 * The third kind — an own uploaded picture — is deliberately absent: its
 * upload, scanning and deletion cascade are #1048/#1049. The stored shape
 * (`avatarKind: ICON | INITIALS | PICTURE`) already carries it, so adding the
 * tile later is a UI change with no migration.
 */
export const CounsellorAvatarField = ({
    value,
    onChange,
    displayName,
    firstname,
    lastname,
    username,
    disabled,
    className,
}: CounsellorAvatarFieldProps) => {
    const { t } = useTranslation();
    const initials = counsellorInitials({ displayName, firstname, lastname, username });
    const viewportRef = useRef<HTMLDivElement>(null);
    const [scroll, setScroll] = useState({ atTop: true, atBottom: true });

    /**
     * Both arrows are disabled at their end of travel, so the control says
     * whether there is more to see instead of silently doing nothing. A 1px
     * tolerance absorbs sub-pixel scroll positions.
     */
    const syncScrollState = useCallback(() => {
        const el = viewportRef.current;
        if (!el) {
            return;
        }
        const max = el.scrollHeight - el.clientHeight;
        setScroll({ atTop: el.scrollTop <= 1, atBottom: el.scrollTop >= max - 1 });
    }, []);

    // The stored choice may sit far down the list: show it on mount rather than
    // making the counsellor hunt for their own avatar. Layout effect so the jump
    // happens before paint, and `scrollTop` rather than scrollIntoView(), which
    // would also scroll the page around the picker.
    useLayoutEffect(() => {
        const el = viewportRef.current;
        const selected = el?.querySelector<HTMLElement>('[aria-checked="true"]');
        if (el && selected) {
            const target = selected.offsetTop - (el.clientHeight - selected.offsetHeight) / 2;
            el.scrollTop = Math.max(0, target);
        }
        syncScrollState();
        // Mount only: later changes are the user's own clicks, and yanking the
        // viewport under them after every pick would be hostile.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The row count changes with the container width, so the end-of-travel
    // state has to be recomputed on resize, not only on scroll.
    useEffect(() => {
        const el = viewportRef.current;
        if (!el || typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const observer = new ResizeObserver(syncScrollState);
        observer.observe(el);
        return () => observer.disconnect();
    }, [syncScrollState]);

    const scrollByRow = (direction: 1 | -1) => {
        viewportRef.current?.scrollBy({ top: direction * ROW_STEP, behavior: 'smooth' });
    };

    const avatars: AvatarOption[] = useMemo(
        () => [
            {
                id: INITIALS_TILE_ID,
                // Until a name is typed there are no initials. A bare red circle
                // read as "failed to load" (owner, 2026-09-24), and a placeholder
                // letter would be a name the counsellor never has — so the tile
                // shows the generic "ABC" glyph that stands for "initials".
                node: initials ? (
                    <span className={styles.initials}>{initials}</span>
                ) : (
                    <AbcIcon aria-hidden="true" data-testid="initials-placeholder" />
                ),
                label: initials ? t('counselor.avatar.initials', { initials }) : t('counselor.avatar.initials.empty'),
            },
            ...ANIMAL_AVATARS.map(({ id, Icon }) => ({
                id,
                node: <Icon />,
                label: t('counselor.avatar.motif', { motif: id }),
            })),
        ],
        [initials, t],
    );

    return (
        <div className={classNames(styles.field, className)}>
            <div className={styles.scroller}>
                <button
                    type="button"
                    className={classNames(styles.arrow, styles.arrowUp)}
                    onClick={() => scrollByRow(-1)}
                    disabled={disabled || scroll.atTop}
                    aria-label={t('counselor.avatar.scrollUp')}
                    // The list itself is the radiogroup; these only move the
                    // viewport, so they must not appear as extra options to AT.
                    tabIndex={-1}
                >
                    <ArrowIcon aria-hidden="true" />
                </button>
                {/* Native overflow: wheel, trackpad, touch and keyboard paging
                    keep working; the arrows are an affordance, not the only way. */}
                <div
                    ref={viewportRef}
                    className={styles.viewport}
                    style={{ maxHeight: VIEWPORT_HEIGHT, padding: VIEWPORT_PADDING }}
                    onScroll={syncScrollState}
                >
                    <AvatarPickerGrid
                        avatars={avatars}
                        value={toTileId(value)}
                        className={classNames({ [styles.disabled]: disabled })}
                        onChange={
                            disabled
                                ? undefined
                                : (id) =>
                                      onChange(
                                          normaliseAvatarValue(
                                              id === INITIALS_TILE_ID
                                                  ? { avatarKind: 'INITIALS' }
                                                  : { avatarKind: 'ICON', avatarId: id },
                                          ),
                                      )
                        }
                    />
                </div>
                <button
                    type="button"
                    className={styles.arrow}
                    onClick={() => scrollByRow(1)}
                    disabled={disabled || scroll.atBottom}
                    aria-label={t('counselor.avatar.scrollDown')}
                    tabIndex={-1}
                >
                    <ArrowIcon aria-hidden="true" />
                </button>
            </div>
            <p className={styles.hint}>{t('counselor.avatar.hint')}</p>
        </div>
    );
};
