import { Button, Col, Form, notification, Row } from 'antd';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import { PostCodeRange } from '../../../api/agency/getAgencyPostCodeRange';
import routePathNames from '../../../appConfig';
import { Page } from '../../../components/Page';
import { useFeatureContext } from '../../../context/FeatureContext';
import { FeatureFlag } from '../../../enums/FeatureFlag';
import { Gender } from '../../../enums/Gender';
import { useAgencyData } from '../../../hooks/useAgencyData';
import { useAgencyPostCodesData } from '../../../hooks/useAgencyPostCodesData';
import { useAgencyUpdate } from '../../../hooks/useAgencyUpdate';
import { convertToOptions } from '../../../utils/convertToOptions';
import { AgencySettings } from './components/AgencySettings';
import { AgencyGeneralInformation } from './components/GeneralInformation';
import { RegistrationSettings } from './components/RegistrationSettings';
import { CounsellingRelation } from '../../../enums/CounsellingRelation';
import { ReleaseToggle } from '../../../enums/ReleaseToggle';
import { useReleasesToggle } from '../../../hooks/useReleasesToggle.hook';
import { useAgencyLegalDataMissing } from '../../../hooks/useAgencyLegalDataMissing';
import { ResponsibleSettings } from './components/ResponsibleSettings';
import { ContactSettings } from './components/ContactSettings';
import styles from '../../../components/Page/styles.module.scss';

function hasOnlyDefaultRangeDefined(data: PostCodeRange[]) {
    return data?.length === 0 || (data?.length === 1 && data[0].from === '00000' && data[0].until === '99999');
}

const DEFAULT_MIN_AGE = 18;
const DEFAULT_MAX_AGE = 100;

export const AgencyPageEdit = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { id } = useParams();
    const isEditing = id !== 'add';
    const [isReadOnly, setReadOnly] = useState(isEditing);
    const [submitted, setSubmitted] = useState(false);
    const { data: agencyData, isLoading } = useAgencyData({ id });
    const { data: postCodes, isLoading: isLoadingPostCodes } = useAgencyPostCodesData({ id });
    const { isEnabled } = useFeatureContext();
    const { isEnabled: isReleaseToggleEnabled } = useReleasesToggle();
    const [form] = Form.useForm();
    const { mutate } = useAgencyUpdate(id);
    const legalDataMissing = useAgencyLegalDataMissing(agencyData);
    const responsibleEntity = Form.useWatch(['dataProtection', 'dataProtectionResponsibleEntity'], form);

    const demographicsInitialValues = isEnabled(FeatureFlag.Demographics)
        ? {
              demographics: {
                  age:
                      agencyData?.demographics?.ageFrom !== undefined
                          ? [agencyData.demographics.ageFrom, agencyData.demographics.ageTo]
                          : [DEFAULT_MIN_AGE, DEFAULT_MAX_AGE],
                  genders: (agencyData?.demographics?.genders || Object.values(Gender)).map((gender) => ({
                      value: gender,
                      label: t(`agency.gender.option.${gender.toLowerCase()}`),
                  })),
              },
          }
        : {};

    const counsellingRelationsInitialValues = isReleaseToggleEnabled(ReleaseToggle.COUNSELLING_RELATIONS)
        ? {
              counsellingRelations: (agencyData?.counsellingRelations || Object.values(CounsellingRelation)).map(
                  (relation) => ({
                      value: relation,
                      label: t(`agency.relation.option.${relation.replace('_COUNSELLING', '').toLowerCase()}`),
                  }),
              ),
          }
        : {};

    const onSubmit = useCallback((formData) => {
        setSubmitted(true);
        const newFormData = {
            ...formData,
            demographics: formData.demographics && {
                ageFrom: formData.demographics.age[0],
                ageTo: formData.demographics.age[1],
                genders: formData.demographics.genders.map(({ value }) => value),
            },
            topicIds: formData.topicIds?.map(({ value }) => value),
            offline: !formData.online,
            counsellingRelations: formData.counsellingRelations?.map(({ value }) => value),
            tenantId: parseInt(formData.tenantId, 10),
        };

        mutate(newFormData, {
            onError: () => {
                setSubmitted(false);
            },
            onSuccess: () => {
                navigate(routePathNames.agency);

                notification.success({
                    message: t(`message.agency.${isEditing ? 'updated' : 'add'}`),
                    duration: 3,
                });
                setSubmitted(false);
                setReadOnly(true);
            },
        });
    }, []);

    const onCancel = useCallback(() => {
        if (isEditing) {
            form.resetFields();
            setReadOnly(true);
        } else {
            navigate(routePathNames.agency);
        }
    }, [isEditing]);

    return (
        <Page isLoading={isLoading || isLoadingPostCodes} stickyHeader>
            <Page.BackWithActions
                path={routePathNames.agency}
                titleKey="agency.edit.general.headline"
                tabs={[
                    {
                        titleKey: 'agency.edit.tab.settings',
                        to: `${routePathNames.agency}/${id}`,
                        icon: legalDataMissing ? <ErrorOutlinedIcon color="error" /> : null,
                    },
                    isEditing &&
                        isEnabled(FeatureFlag.Appointments) && {
                            titleKey: 'agency.edit.tab.initialEnquiry',
                            to: `${routePathNames.agency}/${id}/initial-meeting`,
                        },
                ]}
            >
                {isReadOnly && (
                    <Button type="primary" onClick={() => setReadOnly(false)}>
                        {t('edit')}
                    </Button>
                )}
                {!isReadOnly && (
                    <>
                        <Button type="default" onClick={onCancel}>
                            {t('btn.cancel')}
                        </Button>
                        <Button type="primary" onClick={() => form.submit()} disabled={submitted}>
                            {t('save')}
                        </Button>
                    </>
                )}
            </Page.BackWithActions>
            <Form
                initialValues={{
                    ...agencyData,
                    postCodes: postCodes?.length > 0 ? postCodes : [{ from: '00000', until: '99999' }],
                    ...demographicsInitialValues,
                    ...counsellingRelationsInitialValues,
                    postCodeRangesActive: !hasOnlyDefaultRangeDefined(postCodes || []),
                    online: agencyData?.id ? !agencyData?.offline : false,
                    topicIds: convertToOptions(agencyData?.topics, 'name', 'id', true),
                    tenantId: agencyData?.tenantId?.toString() || '',
                }}
                labelAlign="left"
                labelWrap
                layout="vertical"
                form={form}
                size="large"
                disabled={isReadOnly}
                onFinish={onSubmit}
            >
                <Row gutter={[20, 10]}>
                    <Col xs={12}>
                        <h3 className={styles.backHeadline}>{t(`agency.edit.settings.general.title`)}</h3>
                    </Col>
                    <Col xs={12} lg={6}>
                        <AgencyGeneralInformation />
                        <RegistrationSettings consultingTypeId={agencyData?.consultingType} />
                    </Col>
                    <Col xs={12} lg={6}>
                        <AgencySettings isEditMode={isEditing} />
                    </Col>
                </Row>
                {isEnabled(FeatureFlag.CentralDataProtectionTemplate) && (
                    <Row gutter={[20, 10]}>
                        <Col xs={12}>
                            <h3 className={styles.backHeadline}>
                                {t(`agency.edit.settings.legal.title`)}{' '}
                                {legalDataMissing && <ErrorOutlinedIcon fontSize="small" color="error" />}
                            </h3>
                        </Col>
                        <Col xs={12} lg={6}>
                            <ResponsibleSettings />
                        </Col>
                        <Col xs={12} lg={6}>
                            <ContactSettings type={responsibleEntity} />
                        </Col>
                    </Row>
                )}
            </Form>
        </Page>
    );
};
