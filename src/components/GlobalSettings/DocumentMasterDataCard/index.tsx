import { Typography } from 'antd';
import { useMemo } from 'react';
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
    /** Persists the whole record (the endpoint replaces it as one document). */
    onSave: (data: DpiaMasterData) => void;
    /**
     * ORISO design rule: superadmin-only settings are never hidden, only disabled.
     * Pass true for everyone else — the card renders greyed out and read-only.
     */
    disabled?: boolean;
}

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

    // antd reads `initialValues` once, so the card has to remount when the loaded record
    // arrives — without this the form stays empty after the GET resolves.
    const seedKey = `dpia-master-data-${isLoading ? 'loading' : 'ready'}-${disabled ? 'ro' : 'rw'}`;

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
                onSave={onSave}
                editButtonPlacement="footer"
                allowEdit={!disabled}
                allowUnsavedChanges
            >
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
                        <p className={styles.sectionHint}>{t('globalSettings.documentMasterData.keyFigures.hint')}</p>
                        <div className={styles.fieldGrid}>
                            {DPIA_KEY_FIGURE_NAMES.map((figure) => (
                                <div key={figure} className={styles.keyFigureRow}>
                                    <MuiNumberFormField
                                        label={t(`globalSettings.documentMasterData.keyFigures.${figure}`)}
                                        name={['keyFigures', figure, 'count']}
                                        min={0}
                                    />
                                    <MuiFormField
                                        label={t('globalSettings.documentMasterData.keyFigures.asOfDate')}
                                        name={['keyFigures', figure, 'asOfDate']}
                                        type="date"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </CardEditable>
        </ThemeProvider>
    );
};

export default DocumentMasterDataCard;
