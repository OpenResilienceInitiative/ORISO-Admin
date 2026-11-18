import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { CaseSharingMode } from './caseSharingMode';
import { TileSection } from '../TileSection';
import styles from './styles.module.scss';

const K = 'tenants.permissions.caseSharing';

// #1417: the team option reads the one shared team-function name, so the wording cannot drift.
const OPTIONS: Array<{ mode: CaseSharingMode; labelKey: string; descriptionKey: string }> = [
    {
        mode: 'caseHandover',
        labelKey: `${K}.option.caseHandover.label`,
        descriptionKey: `${K}.option.caseHandover.description`,
    },
    {
        mode: 'teamCounselling',
        labelKey: 'teamFunctions.counselling.name',
        descriptionKey: 'teamFunctions.counselling.description',
    },
    { mode: 'none', labelKey: `${K}.option.none.label`, descriptionKey: `${K}.option.none.description` },
];

export type CaseSharingSectionProps = {
    /** Undefined while the stored values are loading: nothing is preselected. */
    value: CaseSharingMode | undefined;
    onChange?: (mode: CaseSharingMode) => void;
    /** Set: the choice is locked (another level holds it) and this sentence says why. */
    disabledReason?: string;
    /** Today's data has team counselling and case handover on at once. */
    bothActive?: boolean;
    /** Reasons, consent and notification texts; open below the choice when case handover is chosen. */
    handoverSettings?: ReactNode;
};

/**
 * ORISO-Admin#1558: case handover, team counselling or neither, as one choice on the Mailberatung
 * tile. Live chat, group and internal group chats get no such choice: their sessions are short or
 * belong to their members.
 */
export const CaseSharingSection = ({
    value,
    onChange,
    disabledReason,
    bothActive = false,
    handoverSettings,
}: CaseSharingSectionProps) => {
    const { t } = useTranslation();
    const titleId = useId();
    const disabled = Boolean(disabledReason);

    return (
        <TileSection
            title={t(`${K}.title`)}
            description={t(`${K}.description`)}
            titleId={titleId}
            dataTestId="case-sharing-section"
        >
            {bothActive && (
                <p className={styles.warning} role="status">
                    {t(`${K}.bothActive`)}
                </p>
            )}
            <RadioGroup
                aria-labelledby={titleId}
                value={value ?? ''}
                onChange={(_event, next) => onChange?.(next as CaseSharingMode)}
                className={styles.options}
            >
                {OPTIONS.map((option) => (
                    <FormControlLabel
                        key={option.mode}
                        value={option.mode}
                        disabled={disabled}
                        className={styles.option}
                        control={<Radio size="small" />}
                        label={
                            <span className={styles.optionText}>
                                <span className={styles.optionLabel}>{t(option.labelKey)}</span>
                                <span className={styles.optionDescription}>{t(option.descriptionKey)}</span>
                            </span>
                        }
                    />
                ))}
            </RadioGroup>
            {disabledReason && <p className={styles.note}>{disabledReason}</p>}
            {value === 'caseHandover' && handoverSettings && (
                <div role="group" aria-label={t(`${K}.handoverSettings`)} className={styles.handoverSettings}>
                    {handoverSettings}
                </div>
            )}
        </TileSection>
    );
};
