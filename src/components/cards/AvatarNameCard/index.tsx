import classNames from 'classnames';
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
    onUploadPicture,
    onBack,
    onNext,
    className,
}: AvatarNameCardProps) => (
    <Card
        className={classNames(styles.card, className)}
        headerIcon={<PersonIcon />}
        titleKey="Avatar & Name"
        subTitle="Choose whether you only use chat or also video calls and other features. Some options may be disabled by the provider or platform administrator."
        footer={
            <>
                <M3Button variant="text" onClick={onBack}>
                    Back
                </M3Button>
                <M3Button variant="text" onClick={onNext}>
                    Next
                </M3Button>
            </>
        }
    >
        <div className={styles.body}>
            <Typography variant="title-medium" as="h4" className={styles.subsection}>
                Information for those seeking advice
            </Typography>
            <AvatarPickerGrid
                avatars={avatars}
                value={value.avatarId}
                onChange={(avatarId) => onChange({ avatarId })}
            />
            <FloatingLabelInput
                label="Display name for those seeking advice"
                supportingText="Does not have to be unique, can be changed later."
                value={value.publicName}
                onChange={(e) => onChange({ publicName: e.target.value })}
            />

            <Typography variant="title-medium" as="h4" className={styles.subsection}>
                Information for internal communication
            </Typography>
            <ImageUploadField title="Own picture" onUpload={onUploadPicture} />
            <FloatingLabelInput
                label="Display name (Internal)"
                supportingText="If empty, the display name for those seeking advice will be used"
                value={value.internalName}
                onChange={(e) => onChange({ internalName: e.target.value })}
            />
            <ToggleRow
                label="Own picture visible internally only"
                checked={value.ownPictureInternalOnly}
                onCheckedChange={(ownPictureInternalOnly) => onChange({ ownPictureInternalOnly })}
            />
        </div>
    </Card>
);
