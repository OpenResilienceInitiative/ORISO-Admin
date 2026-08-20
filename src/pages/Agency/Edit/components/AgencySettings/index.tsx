import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useFeatureContext } from '../../../../../context/FeatureContext';
import { FeatureFlag } from '../../../../../enums/FeatureFlag';
import { Gender } from '../../../../../enums/Gender';
import { convertToOptions } from '../../../../../utils/convertToOptions';
import { Option, MuiSelectField } from '../../../../../components/mui/MuiSelectField';
import { Card } from '../../../../../components/Card';
import { TopicIcon } from '../../../../../components/CustomIcons/LegalIcons';
import { MuiSliderField } from '../../../../../components/mui/MuiSliderField';
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
                <MuiSelectField
                    label="agency.edit.general.more_settings.tenant.title"
                    name="tenantId"
                    placeholder="plsSelect"
                    options={convertToOptions(tenantsData, 'name', 'id')}
                    disabled={isEditMode}
                    required
                />
            )}

            {topics?.length > 0 && (
                // ADR-014: one Beratungsstelle hosts several Fachbereiche. A department is still the
                // unique (agency × topic) pairing — an agency simply carries more than one of them,
                // each with its own Impressum and Datenschutzerklärung.
                <MuiSelectField
                    label="topics.title"
                    name="topicIds"
                    isMulti
                    labelInValue
                    allowClear
                    placeholder="plsSelect"
                    options={convertToOptions(topics, 'name', 'id')}
                />
            )}

            {isEnabled(FeatureFlag.Demographics) && (
                <>
                    <MuiSliderField
                        className={styles.sliderContainer}
                        label="agency.age"
                        name={['demographics', 'age']}
                        min={0}
                        max={100}
                    />
                    <MuiSelectField
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
                <MuiSelectField
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
        <Card
            isLoading={isLoadingTopics}
            titleKey="agency.edit.settings.title"
            subTitleKey="agency.edit.settings.purpose"
            headerIcon={<TopicIcon />}
        >
            {fields}
        </Card>
    );
};
