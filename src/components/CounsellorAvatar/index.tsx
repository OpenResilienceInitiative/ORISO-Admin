import { useMemo } from 'react';
import classNames from 'classnames';
import { ANIMAL_AVATARS } from '../../resources/img/svg/avatars';
import {
    type CounsellorAvatarValue,
    type CounsellorNameParts,
    counsellorInitials,
    resolveAvatarKind,
} from '../../utils/counsellorAvatar';
import styles from './styles.module.scss';

export interface CounsellorAvatarProps extends CounsellorAvatarValue, CounsellorNameParts {
    /** Outer diameter in px. */
    size?: number;
    /**
     * Accessible name. Omitted → the avatar is decorative (`aria-hidden`),
     * which is what you want next to a visible name.
     */
    label?: string;
    className?: string;
}

/**
 * Renders a counsellor's chosen avatar: the monochrome motif, or the initials,
 * always on the tenant's primary-container pair (#1046/#1047). Consultants
 * without a choice — and the PICTURE kind, whose upload arrives with
 * #1048/#1049 — fall back to the initials, so no row renders empty.
 */
export const CounsellorAvatar = ({
    avatarKind,
    avatarId,
    displayName,
    firstname,
    lastname,
    username,
    size = 40,
    label,
    className,
}: CounsellorAvatarProps) => {
    const kind = resolveAvatarKind({ avatarKind, avatarId });
    const Icon = useMemo(
        () => (kind === 'ICON' ? ANIMAL_AVATARS.find(({ id }) => id === avatarId)?.Icon : undefined),
        [kind, avatarId],
    );
    const initials = counsellorInitials({ displayName, firstname, lastname, username });

    return (
        <span
            data-testid="counsellor-avatar"
            data-avatar-kind={Icon ? 'ICON' : 'INITIALS'}
            data-avatar-id={Icon ? avatarId : undefined}
            className={classNames(styles.avatar, className)}
            // 0.5 keeps two capitals inside the circle while reading as large as
            // the motifs do at 65% (owner: the glyphs were too small).
            style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
        >
            {/* An id that no longer exists in the motif set must not blank the
                avatar — fall through to the initials instead. */}
            {Icon ? <Icon /> : initials}
        </span>
    );
};
