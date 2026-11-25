import { CounsellorAvatar } from '../CounsellorAvatar';
import type { CounsellorAvatarValue, CounsellorNameParts } from '../../utils/counsellorAvatar';
import styles from './styles.module.scss';

export interface CounsellorAvatarBlockProps extends CounsellorAvatarValue, CounsellorNameParts {
    /** Spoken name of the current choice, e.g. "Eule, vorgeschlagenes Icon". */
    label: string;
    changeLabel: string;
    onChange: () => void;
}

/** Large avatar with a "Ändern" pill underneath; the picker opens in a dialog. */
export const CounsellorAvatarBlock = ({ label, changeLabel, onChange, ...avatar }: CounsellorAvatarBlockProps) => (
    <div className={styles.avatarBlock}>
        <CounsellorAvatar {...avatar} size={112} label={label} />
        <button type="button" className={styles.changePill} onClick={onChange}>
            {changeLabel}
        </button>
    </div>
);
