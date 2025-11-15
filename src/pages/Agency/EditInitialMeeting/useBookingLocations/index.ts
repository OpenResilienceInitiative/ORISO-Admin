import { useTranslation } from 'react-i18next';

export const useBookingLocations = () => {
    const { t } = useTranslation();

    return [
        { value: 'integrations:daily', label: t('agency.edit.initialMeeting.eventType.video') },
        { value: 'inPerson', label: t('agency.edit.initialMeeting.eventType.inPerson') },
        { value: 'link', label: t('agency.edit.initialMeeting.eventType.link') },
        { value: 'userPhone', label: t('agency.edit.initialMeeting.eventType.userPhone') },
    ];
};
