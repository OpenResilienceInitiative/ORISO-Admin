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
import { getDiocesesData } from '../../../../../api/agency/getDiocesesData';
import getConsultingTypes from '../../../../../api/consultingtype/getConsultingTypes';
import styles from './styles.module.scss';
import { CounsellingRelation } from '../../../../../enums/CounsellingRelation';
import { ReleaseToggle } from '../../../../../enums/ReleaseToggle';
import { useReleasesToggle } from '../../../../../hooks/useReleasesToggle.hook';
import { useUserRoles } from '../../../../../hooks/useUserRoles.hook';
import { searchTenantData } from '../../../../../api/tenant/searchTenantData';

interface AgencySettingsProps {
    isEditMode: boolean;
}

export const AgencySettings = ({ isEditMode }: AgencySettingsProps) => {
    const [t] = useTranslation();

    const topicIds = Form.useWatch<Option[]>('topicIds') || [];
    const genders = Form.useWatch<Option[]>(['demographics', 'genders']) || [];
    const counsellingRelations = Form.useWatch<Option[]>('counsellingRelations') || [];

    const [diocesesData, setDiocesesData] = useState([]);
    const [consultingTypes, setConsultingTypes] = useState([]);

    const { isEnabled } = useFeatureContext();
    const { isSuperAdmin } = useUserRoles();
    const { isEnabled: isReleaseToggleEnabled } = useReleasesToggle();
    const [tenantsData, setTenantsData] = useState([]);
    const { data: topics, isLoading: isLoadingTopics } = useTenantTopics(true);
    const topicsForList = topics?.filter(({ id }) => !topicIds.find(({ value }) => value === `${id}`));
    const gendersForList = Object.values(Gender).filter((name) => !genders.find(({ value }) => value === `${name}`));
    const counsellingRelationsForList = Object.values(CounsellingRelation).filter(
        (relation) => !counsellingRelations.find(({ value }) => value === `${relation}`),
    );

    useEffect(() => {
        // Load dioceses and consulting types only if feature flag enabled
        if (isEnabled(FeatureFlag.ConsultingTypesForAgencies)) {
            getConsultingTypes()
                .then((cTypes) => setConsultingTypes(cTypes))
                .catch((error) => {
                    console.error('Failed to load consulting types:', error);
                    setConsultingTypes([]);
                });
            getDiocesesData()
                .then((dioceses) => setDiocesesData(dioceses))
                .catch((error) => {
                    console.error('Failed to load dioceses:', error);
                    setDiocesesData([]);
                });
        }

        if (isSuperAdmin) {
            searchTenantData({ perPage: 1000 })
                .then(({ data }) => setTenantsData(data))
                .catch((error) => {
                    console.error('Failed to load tenants:', error);
                    setTenantsData([]);
                });
        }
    }, [isSuperAdmin, isEnabled]);

    return (
        <Card isLoading={isLoadingTopics} titleKey="agency.edit.settings.title">
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

            {/* Topics - ALWAYS VISIBLE (no feature flag) */}
            {topics?.length > 0 && (
                <SelectFormField
                    label="topics.title"
                    name="topicIds"
                    labelInValue
                    isMulti
                    allowClear
                    placeholder="plsSelect"
                    options={convertToOptions(topicsForList, 'name', 'id')}
                />
            )}

            {/* Diocese - HIDDEN (feature flag required) */}
            {isEnabled(FeatureFlag.ConsultingTypesForAgencies) && (
                <SelectFormField
                    label="agency.edit.general.more_settings.diocese.title"
                    name="dioceseId"
                    placeholder="plsSelect"
                    options={convertToOptions(diocesesData, ['id', 'name'], 'id')}
                />
            )}

            {/* Consulting Type - HIDDEN (feature flag required) */}
            {isEnabled(FeatureFlag.ConsultingTypesForAgencies) && (
                <SelectFormField
                    label="agency"
                    name="consultingType"
                    placeholder="plsSelect"
                    options={consultingTypes.map((ct) => ({
                        value: String(ct.id || ''),
                        label: String(ct.titles?.default || ct.id || 'Unknown'),
                    }))}
                />
            )}

            {/* Demographics - HIDDEN (feature flag required) */}
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

            {/* Counselling Relations - HIDDEN (release toggle required) */}
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
        </Card>
    );
};
