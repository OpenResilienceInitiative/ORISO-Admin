import { Alert, Radio } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddonsLoading } from './AddonsLoading';
import { snackbar } from '../../components/Snackbar';
import { AddonSettingsValidationError } from '../../api/addons/addonsApi';
import type { AddonSettingsValues } from '../../addons/addonTypes';
import { AddonSettingsForm } from './AddonSettingsForm';
import { AgencySelect, type SelectOption } from './RemoteSearchSelect';
import { useAddonSettings, useSaveAddonSettings } from './useAddons';
import styles from './addons.module.scss';

interface AddonSettingsSectionProps {
    name: string;
    tenantId: number;
}

type Scope = 'tenant' | 'agency';

const SettingsForScope = ({
    name,
    tenantId,
    agencyId,
}: {
    name: string;
    tenantId: number;
    agencyId: number | null;
}) => {
    const { t } = useTranslation();
    const settings = useAddonSettings(name, tenantId, agencyId);
    const save = useSaveAddonSettings(name, tenantId, agencyId);
    const [invalid, setInvalid] = useState<string | null>(null);

    if (settings.isLoading) {
        return <AddonsLoading />;
    }
    if (settings.isError || !settings.data) {
        return <Alert type="error" showIcon role="alert" message={t('addons.settings.loadError')} />;
    }

    const onSubmit = (values: AddonSettingsValues) => {
        setInvalid(null);
        save.mutate(values, {
            onSuccess: () => snackbar.success(String(t('addons.settings.saved'))),
            onError: (error) => {
                if (error instanceof AddonSettingsValidationError) {
                    setInvalid(error.detail ?? '');
                }
            },
        });
    };

    return (
        <>
            {invalid !== null && (
                <Alert
                    className={styles.formAlert}
                    type="error"
                    showIcon
                    role="alert"
                    message={t('addons.settings.invalid')}
                    description={invalid || undefined}
                />
            )}
            <AddonSettingsForm
                formId={`addon-settings-${name}-${agencyId ?? 'tenant'}`}
                schema={settings.data.schema}
                values={settings.data.values}
                saving={save.isPending}
                onSubmit={onSubmit}
            />
        </>
    );
};

export const AddonSettingsSection = ({ name, tenantId }: AddonSettingsSectionProps) => {
    const { t } = useTranslation();
    const [scope, setScope] = useState<Scope>('tenant');
    const [agency, setAgency] = useState<SelectOption | null>(null);
    const agencyPickerId = `addon-${name}-settings-agency`;

    return (
        <div className={styles.settings}>
            <Radio.Group
                aria-label={String(t('addons.settings.scope'))}
                value={scope}
                onChange={(event) => setScope(event.target.value)}
                optionType="button"
                options={[
                    { value: 'tenant', label: t('addons.settings.scope.tenant') },
                    { value: 'agency', label: t('addons.settings.scope.agency') },
                ]}
            />
            {scope === 'agency' && (
                <div className={styles.scopeAgency}>
                    <label htmlFor={agencyPickerId} className={styles.label}>
                        {t('addons.settings.scope.agency')}
                    </label>
                    <AgencySelect
                        id={agencyPickerId}
                        tenantId={tenantId}
                        className={styles.select}
                        ariaLabel={String(t('addons.settings.scope.agency'))}
                        placeholder={String(t('addons.agencies.placeholder'))}
                        value={agency?.id ?? null}
                        selectedOption={agency}
                        onChange={setAgency}
                    />
                    <p className={styles.hint}>{t('addons.settings.scope.agencyHint')}</p>
                </div>
            )}
            {scope === 'tenant' && <SettingsForScope key="tenant" name={name} tenantId={tenantId} agencyId={null} />}
            {scope === 'agency' && agency && (
                <SettingsForScope key={`agency-${agency.id}`} name={name} tenantId={tenantId} agencyId={agency.id} />
            )}
        </div>
    );
};

export default AddonSettingsSection;
