import { FormInstance, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from '@mui/material/styles';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { CardEditable } from '../../CardEditable';
import { MuiFormField, MuiMultilineFormField, MuiNumberFormField } from '../../mui/MuiFormField';
import { MuiSelectField } from '../../mui/MuiSelectField';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { DPIA_KEY_FIGURE_NAMES, DpiaMasterData } from '../../../types/dpiaMasterData';
import styles from './styles.module.scss';

interface DocumentMasterDataCardProps {
    /** Stored master data; undefined while loading. */
    data?: DpiaMasterData;
    isLoading?: boolean;
    /**
     * Persists the whole record (the endpoint replaces it as one document).
     * `options.onError` is handed down by `CardEditable` to reopen editing on a failed save.
     */
    onSave: (data: DpiaMasterData, options?: { onError?: () => void }) => void;
    /**
     * ORISO design rule: superadmin-only settings are never hidden, only disabled.
     * Pass true for everyone else — the card renders greyed out and read-only.
     */
    disabled?: boolean;
}

/**
 * Pushes a freshly loaded record into the already-mounted form.
 *
 * antd reads `initialValues` once, so a record that changes after mount — a refetch on
 * remount once the 60s staleTime expired, or the sanitized record the save returns — never
 * reaches the fields on its own. Since the card saves the *whole* record, stale fields are
 * not just a display bug: saving would write the outdated copy back over someone else's
 * change.
 *
 * Two records must never be pushed. One that arrives mid-edit would overwrite what the admin
 * is typing, so syncing pauses while `editing`. And the record that was current when they hit
 * save is the copy their submission supersedes — applying it on the way out of edit mode
 * would visibly revert the save until the response lands. `skipped` names that exact object,
 * so any genuinely newer record still syncs, whatever order the updates arrive in.
 */
const SyncLoadedRecord = ({
    form,
    values,
    editing,
    skipped,
}: {
    form: FormInstance;
    values: Record<string, unknown>;
    editing: boolean;
    skipped: React.MutableRefObject<Record<string, unknown> | null>;
}) => {
    const lastSynced = useRef(values);

    useEffect(() => {
        if (values === lastSynced.current || editing) {
            return;
        }
        lastSynced.current = values;
        if (values === skipped.current) {
            return;
        }
        form.setFieldsValue(values);
    }, [form, values, editing, skipped]);

    return null;
};

/**
 * Global settings card for the operator master data the living DPIA and the other legal
 * documents render (ORISO-Admin#735).
 *
 * The card deliberately holds public master data only — operator identity, supervisory
 * authority, review dates and the reported key figures — because the same record is served
 * unauthenticated to the document renderers. Nothing secret belongs in here.
 */
export const DocumentMasterDataCard = ({ data, isLoading, onSave, disabled }: DocumentMasterDataCardProps) => {
    const { t } = useTranslation();

    const initialValues = useMemo(
        () => ({
            operator: data?.operator ?? {},
            supervisoryAuthority: data?.supervisoryAuthority ?? {},
            document: data?.document ?? {},
            keyFigures: data?.keyFigures ?? {},
        }),
        [data],
    );

    // Remount when the card switches between loading/ready or read-only/editable, so the form
    // is rebuilt with the right disabled state. Later record changes do not need a remount —
    // `SyncLoadedRecord` pushes them into the live form.
    const seedKey = `dpia-master-data-${isLoading ? 'loading' : 'ready'}-${disabled ? 'ro' : 'rw'}`;

    // The record the submission supersedes — see `SyncLoadedRecord`.
    const supersededRecord = useRef<Record<string, unknown> | null>(null);
    const handleSave = useCallback(
        (formData: DpiaMasterData, options?: { onError?: () => void }) => {
            supersededRecord.current = initialValues;
            onSave(formData, options);
        },
        [onSave, initialValues],
    );

    const legalFrameworkOptions = useMemo(
        () => [
            { value: 'KDG', label: t('globalSettings.documentMasterData.legalFramework.kdg') },
            { value: 'GDPR', label: t('globalSettings.documentMasterData.legalFramework.gdpr') },
        ],
        [t],
    );

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <CardEditable
                key={seedKey}
                className={styles.card}
                variant="dialog"
                headerIcon={<DescriptionOutlinedIcon />}
                isLoading={isLoading}
                initialValues={initialValues}
                titleKey="globalSettings.documentMasterData.title"
                subTitleKey="globalSettings.documentMasterData.description"
                onSave={handleSave}
                editButtonPlacement="footer"
                allowEdit={!disabled}
                allowUnsavedChanges
            >
                {({ form, editing }) => (
                    <>
                        <SyncLoadedRecord
                            form={form}
                            values={initialValues}
                            editing={editing}
                            skipped={supersededRecord}
                        />
                        <div className={styles.sections}>
                            <section className={styles.section}>
                                <Typography.Text strong className={styles.sectionTitle}>
                                    {t('globalSettings.documentMasterData.operator.title')}
                                </Typography.Text>
                                <div className={styles.fieldGrid}>
                                    <MuiFormField
                                        label={t('globalSettings.documentMasterData.operator.legalName')}
                                        name={['operator', 'legalName']}
                                        inputProps={{ maxLength: 255 }}
                                    />
                                    <MuiFormField
                                        label={t('globalSettings.documentMasterData.operator.shortName')}
                                        name={['operator', 'shortName']}
                                        helpText={t('globalSettings.documentMasterData.operator.shortName.help')}
                                        inputProps={{ maxLength: 255 }}
                                    />
                                    <MuiMultilineFormField
                                        className={styles.wideField}
                                        label={t('globalSettings.documentMasterData.operator.address')}
                                        name={['operator', 'address']}
                                        minRows={2}
                                        inputProps={{ maxLength: 512 }}
                                    />
                                    <MuiFormField
                                        label={t('globalSettings.documentMasterData.operator.contactEmail')}
                                        name={['operator', 'contactEmail']}
                                        rules={[{ type: 'email', message: t('message.error.email.incorrect') }]}
                                        inputProps={{ maxLength: 255 }}
                                    />
                                    <MuiFormField
                                        label={t('globalSettings.documentMasterData.operator.contactPhone')}
                                        name={['operator', 'contactPhone']}
                                        inputProps={{ maxLength: 64 }}
                                    />
                                    <MuiFormField
                                        label={t('globalSettings.documentMasterData.operator.dpoName')}
                                        name={['operator', 'dpoName']}
                                        helpText={t('globalSettings.documentMasterData.operator.dpoName.help')}
                                        inputProps={{ maxLength: 255 }}
                                    />
                                    <MuiFormField
                                        label={t('globalSettings.documentMasterData.operator.department')}
                                        name={['operator', 'department']}
                                        inputProps={{ maxLength: 255 }}
                                    />
                                    <MuiFormField
                                        label={t('globalSettings.documentMasterData.operator.responsiblePerson')}
                                        name={['operator', 'responsiblePerson']}
                                        inputProps={{ maxLength: 255 }}
                                    />
                                </div>
                            </section>

                            <section className={styles.section}>
                                <Typography.Text strong className={styles.sectionTitle}>
                                    {t('globalSettings.documentMasterData.supervisoryAuthority.title')}
                                </Typography.Text>
                                <div className={styles.fieldGrid}>
                                    <MuiSelectField
                                        name={['supervisoryAuthority', 'legalFramework']}
                                        label="globalSettings.documentMasterData.legalFramework"
                                        help="globalSettings.documentMasterData.legalFramework.help"
                                        options={legalFrameworkOptions}
                                        allowClear
                                        disabled={disabled}
                                    />
                                    <MuiFormField
                                        label={t('globalSettings.documentMasterData.supervisoryAuthority.name')}
                                        name={['supervisoryAuthority', 'name']}
                                        inputProps={{ maxLength: 255 }}
                                    />
                                    <MuiMultilineFormField
                                        className={styles.wideField}
                                        label={t('globalSettings.documentMasterData.supervisoryAuthority.address')}
                                        name={['supervisoryAuthority', 'address']}
                                        minRows={2}
                                        inputProps={{ maxLength: 512 }}
                                    />
                                    <MuiFormField
                                        label={t('globalSettings.documentMasterData.supervisoryAuthority.email')}
                                        name={['supervisoryAuthority', 'email']}
                                        rules={[{ type: 'email', message: t('message.error.email.incorrect') }]}
                                        inputProps={{ maxLength: 255 }}
                                    />
                                </div>
                            </section>

                            <section className={styles.section}>
                                <Typography.Text strong className={styles.sectionTitle}>
                                    {t('globalSettings.documentMasterData.document.title')}
                                </Typography.Text>
                                <div className={styles.fieldGrid}>
                                    <MuiFormField
                                        label={t('globalSettings.documentMasterData.document.documentDate')}
                                        name={['document', 'documentDate']}
                                        type="date"
                                    />
                                    <MuiFormField
                                        label={t('globalSettings.documentMasterData.document.nextReviewDate')}
                                        name={['document', 'nextReviewDate']}
                                        type="date"
                                    />
                                </div>
                            </section>

                            <section className={styles.section}>
                                <Typography.Text strong className={styles.sectionTitle}>
                                    {t('globalSettings.documentMasterData.keyFigures.title')}
                                </Typography.Text>
                                {/* Manual entry for now; filling these from platform statistics is a follow-up. */}
                                <p className={styles.sectionHint}>
                                    {t('globalSettings.documentMasterData.keyFigures.hint')}
                                </p>
                                <div className={styles.fieldGrid}>
                                    {DPIA_KEY_FIGURE_NAMES.map((figure) => {
                                        const figureLabel = t(`globalSettings.documentMasterData.keyFigures.${figure}`);
                                        return (
                                            <div key={figure} className={styles.keyFigureRow}>
                                                <MuiNumberFormField
                                                    label={figureLabel}
                                                    name={['keyFigures', figure, 'count']}
                                                    // `min` is only the native input attribute, which a
                                                    // scripted submit walks straight past — the rule is what
                                                    // actually keeps a negative count out of the record.
                                                    min={0}
                                                    rules={[
                                                        {
                                                            type: 'number',
                                                            min: 0,
                                                            message: t(
                                                                'globalSettings.documentMasterData.keyFigures.count.negative',
                                                            ),
                                                        },
                                                    ]}
                                                />
                                                <MuiFormField
                                                    // Each of the four date fields needs its own accessible name — a
                                                    // screen-reader user otherwise hears "As of date" four times over.
                                                    label={t('globalSettings.documentMasterData.keyFigures.asOfDate', {
                                                        figure: figureLabel,
                                                    })}
                                                    name={['keyFigures', figure, 'asOfDate']}
                                                    type="date"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </>
                )}
            </CardEditable>
        </ThemeProvider>
    );
};

export default DocumentMasterDataCard;
