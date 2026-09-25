import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useTranslation } from 'react-i18next';

/** Tab marker: a template arrived that nobody has looked at yet (#1070). */
export const LegalTemplateUnreadMarker = ({ className }: { className?: string }) => {
    const { t } = useTranslation();
    return (
        <FiberManualRecordIcon
            className={className}
            htmlColor="var(--m3-primary)"
            titleAccess={t('legal.proposal.unreadMarker')}
            data-testid="legal-template-unread-marker"
        />
    );
};
