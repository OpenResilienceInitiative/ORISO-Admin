import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import classNames from 'classnames';
import { M3Button } from '../M3Button';
import { WEEKDAYS, type OpeningHoursSlot, type Weekday } from '../../utils/openingHours';
import styles from './styles.module.scss';

interface TimeslotFieldProps {
    value: OpeningHoursSlot[];
    onChange: (next: OpeningHoursSlot[]) => void;
    /** Free text from before structured slots existed — shown read-only, never dropped. */
    legacyText?: string;
    disabled?: boolean;
    className?: string;
}

const DEFAULT_SLOT: OpeningHoursSlot = {
    fromDay: 'MONDAY',
    from: '09:00',
    untilDay: 'MONDAY',
    until: '17:00',
};

/**
 * Structured opening hours (Figma Admin.ORISO 295-6112 "Timeslot Field"): a list
 * of weekday + start/end rows instead of a free textarea, so the hours can be
 * validated here and rendered consistently on the asker-facing cards.
 *
 * Built from the existing admin field stack — a native `time` input and a select
 * inside the shared MUI shell — rather than a date-picker dependency the project
 * does not carry. The value is owned by the caller; serialization into the
 * `openingHours` string lives in `utils/openingHours`.
 */
export const TimeslotField = ({ value, onChange, legacyText, disabled, className }: TimeslotFieldProps) => {
    const { t } = useTranslation();

    const patch = (index: number, change: Partial<OpeningHoursSlot>) =>
        onChange(value.map((slot, i) => (i === index ? { ...slot, ...change } : slot)));

    return (
        <div className={classNames(styles.root, className)}>
            <p className={styles.sectionLabel}>{t('openingHours.section')}</p>

            {value.length === 0 && <p className={styles.empty}>{t('openingHours.empty')}</p>}

            {value.map((slot, index) => (
                <div
                    // Slots have no identity of their own; position is the identity here.
                    // eslint-disable-next-line react/no-array-index-key
                    key={`slot-${index}`}
                    className={styles.slot}
                    role="group"
                    aria-label={`${t('openingHours.slot')} ${index + 1}`}
                >
                    <div className={styles.slotHead}>
                        <span className={styles.slotTitle}>{`${t('openingHours.slot')} ${index + 1}`}</span>
                        <IconButton
                            className={styles.remove}
                            size="small"
                            disabled={disabled}
                            aria-label={`${t('openingHours.remove')} ${index + 1}`}
                            onClick={() => onChange(value.filter((_, i) => i !== index))}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </div>

                    {/* Figma 295-6112: one row per edge, each with weekday + time,
                        so a slot can legitimately cross midnight. */}
                    {(
                        [
                            { edge: 'starts', dayKey: 'fromDay', timeKey: 'from' },
                            { edge: 'ends', dayKey: 'untilDay', timeKey: 'until' },
                        ] as const
                    ).map(({ edge, dayKey, timeKey }) => (
                        <div key={edge} className={styles.row}>
                            <span className={styles.edgeLabel}>{t(`openingHours.${edge}`)}</span>
                            <TextField
                                select
                                size="small"
                                className={styles.day}
                                label={t('openingHours.weekday')}
                                // Visible label stays short (Figma shows the value only);
                                // the accessible name says WHICH edge it belongs to.
                                slotProps={{
                                    htmlInput: {
                                        'aria-label': `${t(`openingHours.${edge}`)} — ${t('openingHours.weekday')}`,
                                    },
                                }}
                                value={slot[dayKey]}
                                disabled={disabled}
                                onChange={(event) => patch(index, { [dayKey]: event.target.value as Weekday })}
                            >
                                {WEEKDAYS.map((day) => (
                                    <MenuItem key={day} value={day}>
                                        {t(`weekday.${day.toLowerCase()}`)}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                type="time"
                                size="small"
                                className={styles.time}
                                label={t('openingHours.time')}
                                value={slot[timeKey]}
                                disabled={disabled}
                                slotProps={{
                                    inputLabel: { shrink: true },
                                    htmlInput: {
                                        'aria-label': `${t(`openingHours.${edge}`)} — ${t('openingHours.time')}`,
                                    },
                                }}
                                onChange={(event) => patch(index, { [timeKey]: event.target.value })}
                            />
                        </div>
                    ))}
                </div>
            ))}

            <M3Button
                // Adding a row is a secondary action: the brand accent stays reserved
                // for the card's primary action, not every affordance inside it.
                variant="outlined"
                icon={<AddIcon fontSize="small" />}
                disabled={disabled}
                className={styles.add}
                onClick={() => onChange([...value, DEFAULT_SLOT])}
            >
                {t('openingHours.add')}
            </M3Button>

            {legacyText && (
                <div className={styles.legacy}>
                    <span className={styles.legacyLabel}>{t('openingHours.legacyLabel')}</span>
                    <p className={styles.legacyText}>{legacyText}</p>
                </div>
            )}
        </div>
    );
};

export default TimeslotField;
