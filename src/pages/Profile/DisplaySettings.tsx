import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { M3Select } from '../../components/M3Select';
import { useAdminDisplay } from '../../context/AdminDisplayContext';
import { ADMIN_TEXT_SCALES } from '../../utils/adminDisplayPreferences';
import styles from './displaySettings.module.scss';

export const DisplaySettings = () => {
    const display = useAdminDisplay();
    const { t } = useTranslation();
    const schemeId = useId();
    const scaleId = useId();
    const contrastId = useId();

    if (!display) return null;

    return (
        <Card titleKey="profile.display.title" dataTestId="profile-display">
            <div className={styles.settings}>
                <label htmlFor={schemeId}>{t('profile.display.scheme')}</label>
                <M3Select
                    classNames={{ popup: { root: styles.dropdown } }}
                    virtual={false}
                    id={schemeId}
                    value={display.schemeChoice}
                    options={[
                        { value: 'system', label: t('profile.display.system') },
                        { value: 'light', label: t('profile.display.light') },
                        { value: 'dark', label: t('profile.display.dark') },
                    ]}
                    onChange={display.setSchemeChoice}
                />
                <label htmlFor={scaleId}>{t('profile.display.size')}</label>
                <M3Select
                    classNames={{ popup: { root: styles.dropdown } }}
                    virtual={false}
                    id={scaleId}
                    value={display.textScale}
                    options={ADMIN_TEXT_SCALES.map((value) => ({
                        value,
                        label: t('profile.display.percent', { percent: value * 100 }),
                    }))}
                    onChange={display.setTextScale}
                />
                <label htmlFor={contrastId}>{t('profile.display.contrast')}</label>
                <M3Select
                    classNames={{ popup: { root: styles.dropdown } }}
                    virtual={false}
                    id={contrastId}
                    value={display.contrast}
                    options={[
                        { value: 'standard', label: t('profile.display.standard') },
                        { value: 'medium', label: t('profile.display.medium') },
                        { value: 'high', label: t('profile.display.high') },
                    ]}
                    onChange={display.setContrast}
                />
            </div>
        </Card>
    );
};
