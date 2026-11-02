import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { Form } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type {
    StatisticsSettingChange,
    StatisticsSettingKey,
    StatisticsSettings,
    StatisticsSettingsUpdate,
} from '../../../types/StatisticsSettings';
import { getStatisticsSettingsHistory } from '../../../api/statistic/statisticsSettings';
import { FETCH_ERRORS } from '../../../api/fetchData';
import { CardEditable } from '../../CardEditable';
import { M3Button } from '../../M3Button';
import { MuiSelectField } from '../../mui/MuiSelectField';
import { useStatisticsSettings } from '../../../hooks/useStatisticsSettings.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { downloadStatisticsSettingsProtocol, statisticsSettingValueLabel } from './statisticsSettingsProtocolCsv';
import styles from './styles.module.scss';

interface Props {
    data?: StatisticsSettings;
    isLoading: boolean;
    isSaving: boolean;
    error?: unknown;
    onSave: (update: StatisticsSettingsUpdate, options?: { onError?: () => void }) => void;
    /** Loads the change protocol for the CSV download. */
    loadProtocol: () => Promise<StatisticsSettingChange[]>;
}

type FormValues = Partial<Record<StatisticsSettingKey, string>>;

const SECTIONS: { key: string; settings: StatisticsSettingKey[] }[] = [
    {
        key: 'minimum',
        settings: ['agencyMinimumCounsellors', 'tenantMinimumCounsellors', 'platformMinimumCounsellors'],
    },
    { key: 'stand', settings: ['agencySnapshotInterval', 'tenantSnapshotInterval', 'platformSnapshotInterval'] },
    { key: 'periods', settings: ['requestChartWeeks', 'topicMonths'] },
    { key: 'tracking', settings: ['messageCountTracking'] },
];

const toFormValues = (data: StatisticsSettings): FormValues =>
    Object.fromEntries(data.settings.map((setting) => [setting.key, setting.value]));

const SyncConfirmedSettings = ({ data, editing }: { data?: StatisticsSettings; editing: boolean }) => {
    const form = Form.useFormInstance();
    const syncedRevision = useRef<number | undefined>(undefined);
    useEffect(() => {
        if (!data || editing || syncedRevision.current === data.revision) return;
        form.setFieldsValue(toFormValues(data));
        syncedRevision.current = data.revision;
    }, [data, editing, form]);
    return null;
};

// The backend sends a local date-time without zone ("2026-11-01T09:30"); only the day is shown,
// taken from the string itself so no time-zone shift can move it to another day.
const formatDay = (dateTime: string, language: string) => {
    const [year, month, day] = dateTime.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return dateTime;
    return new Intl.DateTimeFormat(language, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
};

// MUI's default tooltip is a see-through grey; this one holds a paragraph and must stay readable.
const helpTooltipSx = {
    backgroundColor: '#000',
    color: '#fff',
    fontSize: 14,
    lineHeight: '20px',
    maxWidth: 320,
    p: 1.5,
};
const helpArrowSx = { color: '#000' };

const sinceText = (effectiveFrom: string | null, t: TFunction, language: string) =>
    effectiveFrom
        ? t('globalSettings.statistics.since', { date: formatDay(effectiveFrom, language) })
        : t('globalSettings.statistics.sinceDefault');

/**
 * Global statistics settings (OBP #93): every setting one after another as a select field, with
 * since when its value applies, plus the change protocol as a CSV download. Platform admins only.
 */
export const StatisticsSettingsCard = ({ data, isLoading, isSaving, error, onSave, loadProtocol }: Props) => {
    const { t, i18n } = useTranslation();
    const [form] = Form.useForm();
    const [isDownloading, setIsDownloading] = useState(false);
    const [protocolError, setProtocolError] = useState(false);

    const handleSave = (values: FormValues, saveOptions?: { onError?: () => void }) => {
        if (!data) return;
        const chosen = Object.fromEntries(
            data.settings.map((setting) => [setting.key, values[setting.key] ?? setting.value]),
        ) as FormValues;
        onSave({ values: chosen, revision: data.revision }, saveOptions);
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        setProtocolError(false);
        try {
            downloadStatisticsSettingsProtocol(await loadProtocol(), t);
        } catch {
            setProtocolError(true);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <CardEditable
            className={styles.card}
            variant="dialog"
            headerIcon={<BarChartOutlinedIcon />}
            titleKey="globalSettings.statistics.title"
            subTitleKey="globalSettings.statistics.description"
            initialValues={data ? toFormValues(data) : undefined}
            isLoading={isLoading || isSaving}
            allowEdit={Boolean(data) && !isLoading && !isSaving && !error}
            editButtonPlacement="footer"
            formProp={form}
            onSave={handleSave}
        >
            {({ editing }) => (
                <>
                    <SyncConfirmedSettings data={data} editing={editing} />
                    {Boolean(error) && <Alert severity="error">{t('globalSettings.statistics.error.load')}</Alert>}
                    <div className={styles.fields}>
                        {data &&
                            SECTIONS.map((section) => (
                                <section
                                    key={section.key}
                                    role="group"
                                    aria-labelledby={`statistics-section-${section.key}`}
                                    className={styles.section}
                                >
                                    <div className={styles.sectionHeading}>
                                        <h3 id={`statistics-section-${section.key}`}>
                                            {t(`globalSettings.statistics.section.${section.key}`)}
                                        </h3>
                                        {section.key === 'stand' && (
                                            <Tooltip
                                                arrow
                                                describeChild
                                                enterTouchDelay={0}
                                                leaveTouchDelay={8000}
                                                title={t('globalSettings.statistics.stand.help')}
                                                slotProps={{
                                                    tooltip: { sx: helpTooltipSx },
                                                    arrow: { sx: helpArrowSx },
                                                }}
                                            >
                                                <IconButton
                                                    aria-label={t('globalSettings.statistics.stand.helpLabel')}
                                                    size="small"
                                                >
                                                    <InfoOutlinedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </div>
                                    {data.settings
                                        .filter((setting) => section.settings.includes(setting.key))
                                        .map((setting) => (
                                            <div key={setting.key}>
                                                <MuiSelectField
                                                    name={setting.key}
                                                    label={`globalSettings.statistics.field.${setting.key}`}
                                                    help={sinceText(setting.effectiveFrom, t, i18n.language)}
                                                    required
                                                >
                                                    {setting.options.map((option) => (
                                                        <MuiSelectField.Option
                                                            key={option}
                                                            value={option}
                                                            className={
                                                                option === setting.defaultValue
                                                                    ? styles.defaultOption
                                                                    : undefined
                                                            }
                                                        >
                                                            {statisticsSettingValueLabel(setting.key, option, t)}
                                                        </MuiSelectField.Option>
                                                    ))}
                                                </MuiSelectField>
                                            </div>
                                        ))}
                                </section>
                            ))}
                    </div>
                    <p className={styles.scope}>{t('globalSettings.statistics.defaultNotice')}</p>
                    <p className={styles.scope}>{t('globalSettings.statistics.ownStatisticsNotice')}</p>
                    {data && (
                        <div className={styles.protocol}>
                            <M3Button
                                variant="outlined"
                                icon={<FileDownloadOutlinedIcon />}
                                loading={isDownloading}
                                onClick={handleDownload}
                            >
                                {t('globalSettings.statistics.protocol.download')}
                            </M3Button>
                            <p className={styles.since}>{t('globalSettings.statistics.protocol.hint')}</p>
                            {protocolError && (
                                <Alert severity="error">{t('globalSettings.statistics.protocol.error')}</Alert>
                            )}
                        </div>
                    )}
                </>
            )}
        </CardEditable>
    );
};

export const StatisticsSettingsCardContainer = () => {
    const { isSuperAdmin } = useUserRoles();
    const settings = useStatisticsSettings(isSuperAdmin);
    if (!isSuperAdmin) return null;
    return (
        <StatisticsSettingsCard
            data={settings.data}
            isLoading={settings.isLoading}
            isSaving={settings.isSaving}
            error={settings.error}
            loadProtocol={getStatisticsSettingsHistory}
            onSave={(update, options) =>
                settings.save(update, {
                    onError: (failure) => {
                        if (failure instanceof Error && failure.message === FETCH_ERRORS.CONFLICT) return;
                        options?.onError?.();
                    },
                })
            }
        />
    );
};
