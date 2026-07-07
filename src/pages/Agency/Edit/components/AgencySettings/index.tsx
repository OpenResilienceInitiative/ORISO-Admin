import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useFeatureContext } from '../../../../../context/FeatureContext';
import { FeatureFlag } from '../../../../../enums/FeatureFlag';
import { Gender } from '../../../../../enums/Gender';
import { convertToOptions } from '../../../../../utils/convertToOptions';
import { Option, SelectFormField } from '../../../../../components/SelectFormField';
import { Card } from '../../../../../components/Card';
import { SliderFormField } from '../../../../../components/SliderFormField';
import { useTenantTopics } from '../../../../../hooks/useTenantTopics';
import styles from './styles.module.scss';
import { CounsellingRelation } from '../../../../../enums/CounsellingRelation';
import { ReleaseToggle } from '../../../../../enums/ReleaseToggle';
import { useReleasesToggle } from '../../../../../hooks/useReleasesToggle.hook';
import { useUserRoles } from '../../../../../hooks/useUserRoles.hook';
import { searchTenantData } from '../../../../../api/tenant/searchTenantData';

interface AgencySettingsProps {
    isEditMode: boolean;
    asFields?: boolean;
}

export const AgencySettings = ({ isEditMode, asFields }: AgencySettingsProps) => {
    const [t] = useTranslation();

    const genders = Form.useWatch<Option[]>(['demographics', 'genders']) || [];
    const counsellingRelations = Form.useWatch<Option[]>('counsellingRelations') || [];

    const { isEnabled } = useFeatureContext();
    const { isSuperAdmin } = useUserRoles();
    const { isEnabled: isReleaseToggleEnabled } = useReleasesToggle();
    const [tenantsData, setTenantsData] = useState([]);
    const { data: topics, isLoading: isLoadingTopics } = useTenantTopics(true);
    const gendersForList = Object.values(Gender).filter((name) => !genders.find(({ value }) => value === `${name}`));
    const counsellingRelationsForList = Object.values(CounsellingRelation).filter(
        (relation) => !counsellingRelations.find(({ value }) => value === `${relation}`),
    );

    useEffect(() => {
        if (isSuperAdmin) {
            searchTenantData({ perPage: 1000 })
                .then(({ data }) => setTenantsData(data))
                .catch(() => {
                    setTenantsData([]);
                });
        }
    }, [isSuperAdmin]);

    const fields = (
        <>
            {isSuperAdmin && (
                <SelectFormField
                    label="agency.edit.general.more_settings.tenant.title"
                    name="tenantId"
                    placeholder="plsSelect"
                    options={convertToOptions(tenantsData, 'name', 'id')}
                    disabled={isEditMode}
                    required
                />
            )}

            {topics?.length > 0 && (
                // ADR-003: a department is the unique (agency × topic) pairing, so an agency maps to
                // at most one topic — single-select replaces the former multi-select.
                <SelectFormField
                    label="topics.title"
                    name="topicIds"
                    labelInValue
                    allowClear
                    placeholder="plsSelect"
                    options={convertToOptions(topics, 'name', 'id')}
                />
            )}

            {isEnabled(FeatureFlag.Demographics) && (
                <>
                    <SliderFormField
                        className={styles.sliderContainer}
                        label="agency.age"
                        name={['demographics', 'age']}
                        min={0}
                        max={100}
                    />
                    <SelectFormField
                        required
                        placeholder={t('select.placeholder')}
                        labelInValue
                        label="agency.gender"
                        name={['demographics', 'genders']}
                        isMulti
                        options={gendersForList.map((gender) => ({
                            value: gender,
                            label: t(`agency.gender.option.${gender.toLowerCase()}`),
                        }))}
                    />
                </>
            )}

            {isReleaseToggleEnabled(ReleaseToggle.COUNSELLING_RELATIONS) && (
                <SelectFormField
                    required
                    placeholder={t('select.placeholder')}
                    labelInValue
                    label="agency.relation"
                    name="counsellingRelations"
                    isMulti
                    options={counsellingRelationsForList.map((relation) => ({
                        value: relation,
                        label: t(`agency.relation.option.${relation.replace('_COUNSELLING', '').toLowerCase()}`),
                    }))}
                />
            )}
        </>
    );

    if (asFields) {
        return fields;
    }

    return (
        <Card isLoading={isLoadingTopics} titleKey="agency.edit.settings.title">
            {fields}
        </Card>
    );
};
