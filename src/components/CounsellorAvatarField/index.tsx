import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { AvatarPickerGrid, type AvatarOption } from '../AvatarPickerGrid';
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

    const avatars: AvatarOption[] = useMemo(
        () => [
            {
                id: INITIALS_TILE_ID,
                // Empty until a name is typed — an empty tinted circle is honest,
                // a placeholder letter would be a name the counsellor never has.
                node: <span className={styles.initials}>{initials}</span>,
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
            <p className={styles.hint}>{t('counselor.avatar.hint')}</p>
        </div>
    );
};
