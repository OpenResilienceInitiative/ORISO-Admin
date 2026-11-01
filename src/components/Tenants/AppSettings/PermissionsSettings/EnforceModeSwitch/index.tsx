import SettingsIcon from '@mui/icons-material/Settings';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../../../M3Button';
import styles from './styles.module.scss';

export type EnforceModeSwitchProps = {
    enforceMode: boolean;
    onChange: (enforceMode: boolean) => void;
    /** Label of the first (default) mode; defaults to "Configure". */
    configLabel?: string;
    /** Label of the second (enforcing) mode; defaults to "Enforce activated selections". */
    enforceLabel?: string;
    /** Accessible name of the pair, for a switch that sits beside other controls. */
    groupLabel?: string;
    disabled?: boolean;
};

/**
 * Footer control that toggles "enforce active states" mode on the SuperAdmin permissions cards
 * (Figma node 105:11334): a "Configure" mode for normal editing, and an "Enforce activated
 * selections" mode that reveals the per-feature enforce checkboxes. See ORISO-Admin#297.
 * A setting with the same recommendation/requirement choice reuses it with its own labels
 * (ORISO-Admin#1215).
 */
export const EnforceModeSwitch = ({
    enforceMode,
    onChange,
    configLabel,
    enforceLabel,
    groupLabel,
    disabled = false,
}: EnforceModeSwitchProps) => {
    const { t } = useTranslation();

    return (
        <div className={styles.switch} role={groupLabel ? 'group' : undefined} aria-label={groupLabel}>
            <M3Button
                variant="text"
                icon={<SettingsIcon fontSize="small" />}
                disabled={disabled}
                aria-pressed={!enforceMode}
                className={!enforceMode ? styles.active : undefined}
                onClick={() => onChange(false)}
            >
                {configLabel ?? t('tenants.permissions.enforce.configAction')}
            </M3Button>
            <M3Button
                variant="text"
                icon={<CheckIcon fontSize="small" />}
                disabled={disabled}
                aria-pressed={enforceMode}
                className={enforceMode ? styles.active : undefined}
                onClick={() => onChange(true)}
            >
                {enforceLabel ?? t('tenants.permissions.enforce.action')}
            </M3Button>
        </div>
    );
};
