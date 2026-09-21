import { Button, Form, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LabeledValue } from 'antd/lib/select';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import { MuiSelectField } from '../mui/MuiSelectField';
import { Modal, DialogButton } from '../Modal';
import { useAgenciesData } from '../../hooks/useAgencysData';
import { convertToOptions } from '../../utils/convertToOptions';
import { grantConsultantIdentityData } from '../../api/admins/grantConsultantIdentityData';
import { isActiveDeleteDate } from '../../utils/deleteDate';
import { topicOptionsForAgencies } from './topicOptionsForAgencies';
import styles from './styles.module.scss';

interface GrantConsultantIdentityModalProps {
    adminId: string;
    tenantId?: number | string;
    onSuccess?: () => void;
    disabled?: boolean;
    /** i18n key of the trigger button; the self-service entry in the profile words it for "me". */
    buttonLabelKey?: string;
    /** i18n key of the success toast; the self-service entry addresses the admin directly. */
    successMessageKey?: string;
}

interface GrantConsultantIdentityFormValues {
    agencies?: LabeledValue[];
    topicIds?: LabeledValue[];
}

export const GrantConsultantIdentityModal = ({
    adminId,
    tenantId,
    onSuccess,
    disabled,
    buttonLabelKey = 'grantConsultantIdentity.button',
    successMessageKey = 'message.grantConsultantIdentity.success',
}: GrantConsultantIdentityModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm<GrantConsultantIdentityFormValues>();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: agenciesData, isLoading } = useAgenciesData({ pageSize: 10000 });

    const tenantIdNumber = tenantId !== undefined && tenantId !== null ? parseInt(`${tenantId}`, 10) : undefined;
    const availableAgencies = (agenciesData?.data || []).filter(
        (agency) =>
            isActiveDeleteDate(agency.deleteDate) &&
            (tenantIdNumber === undefined || agency.tenantId === tenantIdNumber),
    );

    // A consultant without a topic is never matched to an enquiry, so the topic is not optional:
    // only the topics the chosen Beratungsstellen actually offer can be picked.
    const selectedAgencies = Form.useWatch('agencies', form);
    const selectedAgencyIds = (selectedAgencies || []).map(({ value }) => `${value}`);
    const selectedAgencyKey = selectedAgencyIds.join(',');
    const topicOptions = useMemo(
        () => topicOptionsForAgencies(availableAgencies, selectedAgencyIds),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on ids, the arrays are rebuilt every render
        [agenciesData, selectedAgencyKey],
    );
    const topicOptionsKey = topicOptions.map(({ value }) => value).join(',');
    const hasAgencies = selectedAgencyIds.length > 0;
    const hasNoTopics = hasAgencies && topicOptions.length === 0;
    const hasSingleTopic = topicOptions.length === 1;

    useEffect(() => {
        if (!open) return;
        if (hasSingleTopic) {
            // Only one topic to counsel in: assign it, there is nothing to choose.
            form.setFieldValue('topicIds', topicOptions);
            return;
        }
        // Drop topics whose Beratungsstelle was deselected again.
        const current: LabeledValue[] = form.getFieldValue('topicIds') || [];
        const allowed = new Set(topicOptions.map(({ value }) => `${value}`));
        const kept = current.filter(({ value }) => allowed.has(`${value}`));
        if (kept.length !== current.length) form.setFieldValue('topicIds', kept);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the option ids
    }, [open, topicOptionsKey]);

    const closeModal = () => {
        setOpen(false);
        form.resetFields();
    };

    const onConfirm = async () => {
        try {
            const values = await form.validateFields();
            const agencyIds = (values.agencies || []).map(({ value }) => `${value}`);
            const topicIds = (values.topicIds || []).map(({ value }) => `${value}`);

            setIsSubmitting(true);
            await grantConsultantIdentityData(adminId, {
                formalLanguage: true,
                agencyIds,
                topicIds,
            });

            message.success({ content: t(successMessageKey), duration: 8 });
            closeModal();
            onSuccess?.();
        } catch (error) {
            // Form validation errors carry an errorFields array — those are surfaced inline by antd,
            // so only show the API error toast for real request failures.
            if (error && typeof error === 'object' && 'errorFields' in error) {
                return;
            }
            message.error({ content: t('message.grantConsultantIdentity.error'), duration: 8 });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Button type="default" disabled={disabled} onClick={() => setOpen(true)}>
                {t(buttonLabelKey)}
            </Button>
            {open && (
                <Modal
                    titleKey="grantConsultantIdentity.modal.title"
                    icon={<AssignmentIndOutlinedIcon />}
                    footer={
                        <div className={styles.footerActions}>
                            <DialogButton onClick={closeModal} disabled={isSubmitting}>
                                {t('btn.cancel')}
                            </DialogButton>
                            <DialogButton primary loading={isSubmitting} disabled={hasNoTopics} onClick={onConfirm}>
                                {t('grantConsultantIdentity.modal.confirm')}
                            </DialogButton>
                        </div>
                    }
                    onClose={closeModal}
                >
                    <Form form={form} layout="vertical" className={styles.fields}>
                        <MuiSelectField
                            name="agencies"
                            label="grantConsultantIdentity.modal.agencyLabel"
                            labelInValue
                            isMulti
                            required
                            loading={isLoading}
                            placeholder="plsSelect"
                            options={convertToOptions(availableAgencies, ['postcode', 'name', 'city'], 'id')}
                        />
                        {hasAgencies && !hasNoTopics && (
                            <MuiSelectField
                                name="topicIds"
                                label="grantConsultantIdentity.modal.topicLabel"
                                help={hasSingleTopic ? 'grantConsultantIdentity.modal.singleTopicHint' : undefined}
                                labelInValue
                                isMulti
                                required
                                disabled={hasSingleTopic}
                                placeholder="plsSelect"
                                options={topicOptions}
                            />
                        )}
                        {hasNoTopics && (
                            <p role="alert" className={styles.noTopics}>
                                {t('grantConsultantIdentity.modal.noTopics')}
                            </p>
                        )}
                    </Form>
                </Modal>
            )}
        </>
    );
};
