import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Card } from '../../Card';
import { Typography } from '../../Typography';
import { AvatarPickerGrid, type AvatarOption } from '../../AvatarPickerGrid';
import { FloatingLabelInput } from '../../FloatingLabelInput';
import { ImageUploadField } from '../../ImageUploadField';
import { ToggleRow } from '../../ToggleRow';
import { M3Button } from '../../M3Button';
import { ReactComponent as PersonIcon } from '../../../resources/img/svg/person.svg';
import styles from './styles.module.scss';

export interface AvatarNameValue {
    avatarId?: string;
    publicName: string;
    internalName: string;
    ownPictureInternalOnly: boolean;
}

export interface AvatarNameCardProps {
    avatars: AvatarOption[];
    value: AvatarNameValue;
    onChange: (patch: Partial<AvatarNameValue>) => void;
    /**
     * Reduced "names only" variant (#997): the avatar grid and the picture
     * upload/toggle sections are hidden until the avatar feature ships (#995).
     * The two-subsection structure stays, so the avatar block can slot back in.
     */
    showAvatarSection?: boolean;
    showPictureSection?: boolean;
    onUploadPicture?: () => void;
    onBack?: () => void;
    onNext?: () => void;
    className?: string;
}

/**
 * Counsellor Setup Wizard — "Avatar & Name" step (Figma 1-34788). Assembles
 * AvatarPickerGrid + FloatingLabelInput + ImageUploadField + ToggleRow under two
 * Typography subsections, inside the shared Card skeleton.
 */
export const AvatarNameCard = ({
    avatars,
    value,
    onChange,
    showAvatarSection = true,
    showPictureSection = true,
    onUploadPicture,
    onBack,
    onNext,
    className,
}: AvatarNameCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            className={classNames(styles.card, className)}
            headerIcon={<PersonIcon />}
            titleKey={showAvatarSection ? 'cards.avatarName.title' : 'cards.avatarName.titleNamesOnly'}
            subTitle={t('cards.avatarName.subtitle')}
            footer={
                onBack || onNext ? (
                    <>
                        {onBack && (
                            <M3Button variant="text" onClick={onBack}>
                                {t('cards.actions.back')}
                            </M3Button>
                        )}
                        {onNext && (
                            <M3Button variant="text" onClick={onNext}>
                                {t('cards.actions.next')}
                            </M3Button>
                        )}
                    </>
                ) : undefined
            }
        >
            <div className={styles.body}>
                <Typography variant="title-medium" as="h4" className={styles.subsection}>
                    {t('cards.avatarName.publicSection')}
                </Typography>
                {showAvatarSection && (
                    <AvatarPickerGrid
                        avatars={avatars}
                        value={value.avatarId}
                        onChange={(avatarId) => onChange({ avatarId })}
                    />
                )}
                <FloatingLabelInput
                    label={t('cards.avatarName.publicName')}
                    supportingText={t('cards.avatarName.publicNameHint')}
                    value={value.publicName}
                    onChange={(e) => onChange({ publicName: e.target.value })}
                />

                <Typography variant="title-medium" as="h4" className={styles.subsection}>
                    {t('cards.avatarName.internalSection')}
                </Typography>
                {showPictureSection && (
                    <ImageUploadField title={t('cards.avatarName.ownPicture')} onUpload={onUploadPicture} />
                )}
                <FloatingLabelInput
                    label={t('cards.avatarName.internalName')}
                    supportingText={t('cards.avatarName.internalNameHint')}
                    value={value.internalName}
                    onChange={(e) => onChange({ internalName: e.target.value })}
                />
                {showPictureSection && (
                    <ToggleRow
                        label={t('cards.avatarName.ownPictureInternalOnly')}
                        checked={value.ownPictureInternalOnly}
                        onCheckedChange={(ownPictureInternalOnly) => onChange({ ownPictureInternalOnly })}
                    />
                )}
            </div>
        </Card>
    );
};
