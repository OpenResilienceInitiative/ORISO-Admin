import { message, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import Title from 'antd/lib/typography/Title';
import { useLocation } from 'react-router';
import { AgencyEditData } from '../../../../types/agencyEdit';
import deleteAgencyEventType from '../../../../api/agency/deleteAgencyEventType';

export const EventTypeDeletionModal = (props: {
    showDeleteModal: boolean;
    handleCancel?: (callback: Function) => void;
    handleSave?: (callback: Function) => void;
    eventType: AgencyEditData;
}) => {
    const { t } = useTranslation();
    const currentPath = useLocation().pathname;
    const [, agencyId] = currentPath.match(/.*\/([^/]+)\/[^/]+/);
    const handleOnDelete = () => {
        deleteAgencyEventType(agencyId, props.eventType.id)
            .then(() => {
                message.success({
                    content: t('message.eventType.delete'),
                    duration: 3,
                });
                props.handleSave(() => {});
            })
            .catch(() => {
                props.handleSave(() => {});
            });
    };

    return (
        <Modal
            title={<Title level={2}>{t('agency.edit.initialMeeting.modal_delete_consultation_type.title')}</Title>}
            open={props.showDeleteModal}
            onOk={handleOnDelete}
            onCancel={() => {
                props.handleCancel(() => {});
            }}
            cancelText={t('btn.cancel.uppercase')}
            centered
            okText={t('agency.edit.initialMeeting.modal_delete_consultation_type.btn.ok.uppercase')}
        >
            <p>{t('agency.edit.initialMeeting.modal_delete_consultation_type.description')}</p>
        </Modal>
    );
};
