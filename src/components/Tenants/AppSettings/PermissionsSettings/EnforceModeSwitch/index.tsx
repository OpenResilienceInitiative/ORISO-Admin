import SettingsIcon from '@mui/icons-material/Settings';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../../../M3Button';
import styles from './styles.module.scss';

export type EnforceModeSwitchProps = {
    enforceMode: boolean;
    onChange: (enforceMode: boolean) => void;
};

/**
 * Footer control that toggles "enforce active states" mode on the SuperAdmin permissions cards
 * (Figma node 105:11334): a "Configure" mode for normal editing, and an "Enforce activated
 * selections" mode that reveals the per-feature enforce checkboxes. See ORISO-Admin#297.
 */
export const EnforceModeSwitch = ({ enforceMode, onChange }: EnforceModeSwitchProps) => {
    const { t } = useTranslation();

    return (
        <div className={styles.switch}>
            <M3Button
                variant="text"
                icon={<SettingsIcon fontSize="small" />}
                aria-pressed={!enforceMode}
                className={!enforceMode ? styles.active : undefined}
                onClick={() => onChange(false)}
            >
                {t('tenants.permissions.enforce.configAction')}
            </M3Button>
            <M3Button
                variant="text"
                icon={<CheckIcon fontSize="small" />}
                aria-pressed={enforceMode}
                className={enforceMode ? styles.active : undefined}
                onClick={() => onChange(true)}
            >
                {t('tenants.permissions.enforce.action')}
            </M3Button>
        </div>
    );
};
