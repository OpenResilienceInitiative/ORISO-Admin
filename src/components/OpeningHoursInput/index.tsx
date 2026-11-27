import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigProvider, Form } from 'antd';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import classNames from 'classnames';
import { M3Button } from '../M3Button';
import { MuiSwitch } from '../mui/MuiSwitchField';
import { TimeslotField } from '../TimeslotField';
import {
    DEFAULT_RANGE,
    WEEKDAYS,
    copyDay,
    isRangeValid,
    isWeekCompatible,
    nextRange,
    parseOpeningHours,
    serializeOpeningHours,
    slotsFromWeek,
    weekFromSlots,
    type DayRange,
    type OpeningHoursSlot,
    type Weekday,
    type WeekSchedule,
} from '../../utils/openingHours';
import styles from './styles.module.scss';

const WEEKDAYS_MO_FR: readonly Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

export interface OpeningHoursInputProps {
    /** The stored `openingHours` string: structured JSON payload, legacy free text or empty. */
    value?: string | null;
    onChange?: (next: string) => void;
    disabled?: boolean;
    className?: string;
}

/**
 * Opening hours as one row per weekday (open/closed switch, one or more from–until ranges,
 * copy to other days). It edits the SAME slot list as {@link TimeslotField} and serialises to the
 * same stored string (`{"version":1,"openingHours":[…]}`), so the API contract and the Frontend
 * reader stay untouched.
 *
 * Three modes, decided from the stored value:
 * - weekday rows: empty or structured value whose slots each stay inside one day;
 * - timeslot editor: structured value with slots that run past midnight (not expressible per day);
 * - free text: a legacy hand-typed value. It stays free text (never silently dropped or rewritten)
 *   until the user explicitly switches to structured hours.
 */
export const OpeningHoursInput = ({ value, onChange, disabled, className }: OpeningHoursInputProps) => {
    const { t } = useTranslation();
    const { componentDisabled } = ConfigProvider.useConfig();
    const isDisabled = !!disabled || !!componentDisabled;

    const parsed = useMemo(() => parseOpeningHours(value), [value]);
    const [legacyMode, setLegacyMode] = useState(parsed.legacyText !== '');
    const [week, setWeek] = useState<WeekSchedule>(() => weekFromSlots(parsed.slots));
    const [copyMenu, setCopyMenu] = useState<{ day: Weekday; anchor: HTMLElement } | null>(null);
    const lastEmitted = useRef<string>(serializeOpeningHours(parsed.slots));

    // Follow external value changes (form reset, remount with fresh data) without clobbering
    // half-edited rows: only resync when the stored string differs from what we last emitted.
    useEffect(() => {
        const incoming = serializeOpeningHours(parsed.slots);
        if (incoming !== lastEmitted.current) {
            lastEmitted.current = incoming;
            setWeek(weekFromSlots(parsed.slots));
        }
    }, [parsed.slots]);

    const commit = (next: WeekSchedule) => {
        setWeek(next);
        const serialized = serializeOpeningHours(slotsFromWeek(next));
        lastEmitted.current = serialized;
        onChange?.(serialized);
    };

    const patchDay = (day: Weekday, ranges: DayRange[]) => commit({ ...week, [day]: ranges });
    const patchRange = (day: Weekday, index: number, change: Partial<DayRange>) =>
        patchDay(
            day,
            week[day].map((range, i) => (i === index ? { ...range, ...change } : range)),
        );

    if (legacyMode) {
        return (
            <div className={classNames(styles.root, className)} data-mode="legacy">
                <p className={styles.note} role="note">
                    <EditNoteOutlinedIcon fontSize="small" aria-hidden />
                    {t('openingHours.legacyNotice')}
                </p>
                <TextField
                    multiline
                    minRows={3}
                    fullWidth
                    value={parsed.legacyText || (value ?? '')}
                    placeholder={t('openingHours.legacyPlaceholder')}
                    disabled={isDisabled}
                    onChange={(event) => {
                        lastEmitted.current = event.target.value;
                        onChange?.(event.target.value);
                    }}
                    slotProps={{ htmlInput: { 'aria-label': t('openingHours.section'), maxLength: 1000 } }}
                />
                <M3Button
                    variant="outlined"
                    disabled={isDisabled}
                    className={styles.convert}
                    onClick={() => {
                        setLegacyMode(false);
                        setWeek(weekFromSlots([]));
                        lastEmitted.current = '';
                        onChange?.('');
                    }}
                >
                    {t('openingHours.legacyConvert')}
                </M3Button>
            </div>
        );
    }

    if (!isWeekCompatible(parsed.slots)) {
        return (
            <div className={classNames(styles.root, className)} data-mode="slots">
                <div className={styles.note} role="note">
                    {t('openingHours.crossNotice')}
                </div>
                <TimeslotField
                    value={parsed.slots}
                    disabled={isDisabled}
                    onChange={(next: OpeningHoursSlot[]) => {
                        lastEmitted.current = serializeOpeningHours(next);
                        onChange?.(serializeOpeningHours(next));
                    }}
                />
            </div>
        );
    }

    return (
        <div className={classNames(styles.root, className)} data-mode="week">
            <ul className={styles.week}>
                {WEEKDAYS.map((day) => {
                    const ranges = week[day];
                    const open = ranges.length > 0;
                    const dayName = t(`weekday.${day.toLowerCase()}`);
                    return (
                        <li key={day} className={classNames(styles.day, { [styles.dayClosed]: !open })}>
                            <div className={styles.dayHead}>
                                <MuiSwitch
                                    checked={open}
                                    disabled={isDisabled}
                                    ariaLabel={t('openingHours.dayOpen', { day: dayName })}
                                    onChange={(next) => patchDay(day, next ? [{ ...DEFAULT_RANGE }] : [])}
                                />
                                <span className={styles.dayName}>{dayName}</span>
                            </div>
                            <div className={styles.dayBody}>
                                {!open && (
                                    <span className={styles.closed}>
                                        <EventBusyOutlinedIcon fontSize="small" aria-hidden />
                                        {t('openingHours.closed')}
                                    </span>
                                )}
                                {ranges.map((range, index) => {
                                    const invalid = !isRangeValid(range) && range.from !== '' && range.until !== '';
                                    return (
                                        // Ranges have no identity of their own; position is the identity.
                                        // eslint-disable-next-line react/no-array-index-key
                                        <div key={`${day}-${index}`} className={styles.range}>
                                            {(['from', 'until'] as const).map((edge) => (
                                                <TextField
                                                    key={edge}
                                                    type="time"
                                                    className={styles.time}
                                                    label={t(`openingHours.${edge}`)}
                                                    value={range[edge]}
                                                    disabled={isDisabled}
                                                    error={invalid}
                                                    onChange={(event) =>
                                                        patchRange(day, index, { [edge]: event.target.value })
                                                    }
                                                    slotProps={{
                                                        inputLabel: { shrink: true },
                                                        htmlInput: {
                                                            'aria-label': `${dayName} — ${t(`openingHours.${edge}`)}`,
                                                        },
                                                    }}
                                                />
                                            ))}
                                            {ranges.length > 1 && (
                                                <IconButton
                                                    disabled={isDisabled}
                                                    aria-label={`${dayName} — ${t('openingHours.removeRange')}`}
                                                    onClick={() =>
                                                        patchDay(
                                                            day,
                                                            ranges.filter((_, i) => i !== index),
                                                        )
                                                    }
                                                >
                                                    <CloseIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                            {invalid && (
                                                <span className={styles.rangeError} role="alert">
                                                    {t('openingHours.endBeforeStart')}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                                {open && !isDisabled && (
                                    <div className={styles.dayActions}>
                                        <M3Button
                                            variant="text"
                                            icon={<AddIcon fontSize="small" />}
                                            onClick={() => patchDay(day, [...ranges, nextRange(ranges)])}
                                        >
                                            {t('openingHours.addRange')}
                                        </M3Button>
                                        <IconButton
                                            aria-label={`${dayName} — ${t('openingHours.copyTo')}`}
                                            aria-haspopup="menu"
                                            onClick={(event) => setCopyMenu({ day, anchor: event.currentTarget })}
                                        >
                                            <ContentCopyOutlinedIcon fontSize="small" />
                                        </IconButton>
                                    </div>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
            <Menu anchorEl={copyMenu?.anchor} open={!!copyMenu} onClose={() => setCopyMenu(null)}>
                <MenuItem
                    onClick={() => {
                        if (copyMenu) commit(copyDay(week, copyMenu.day, WEEKDAYS_MO_FR));
                        setCopyMenu(null);
                    }}
                >
                    {t('openingHours.copyWeekdays')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (copyMenu) commit(copyDay(week, copyMenu.day, WEEKDAYS));
                        setCopyMenu(null);
                    }}
                >
                    {t('openingHours.copyAll')}
                </MenuItem>
            </Menu>
        </div>
    );
};

interface OpeningHoursFormFieldProps {
    /** antd form path; keeps the existing `openingHours` string binding. */
    name?: string | Array<string | number>;
    label?: string;
    disabled?: boolean;
}

/** antd `Form.Item` adapter: the form keeps holding the stored `openingHours` string. */
export const OpeningHoursFormField = ({ name = 'openingHours', label, disabled }: OpeningHoursFormFieldProps) => (
    <Form.Item name={name} label={label} className={styles.formItem} colon={false}>
        <OpeningHoursInput disabled={disabled} />
    </Form.Item>
);

export default OpeningHoursInput;
