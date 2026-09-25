import { useEffect } from 'react';
import type { FormInstance } from 'antd';

interface OpenDepartmentFieldOnRequestProps {
    /** Grows by one per "Fachbereich hinzufügen" click; 0 means no jump requested yet. */
    request: number;
    startEditing: () => void;
    form: Pick<FormInstance, 'scrollToField'>;
}

/**
 * Lives inside the "Einstellungen zum Beratungsangebot" card: opens it for editing and
 * moves to its Fachbereich field when the empty Fachbereich-Details card asks for it (#1069).
 */
export const OpenDepartmentFieldOnRequest = ({ request, startEditing, form }: OpenDepartmentFieldOnRequestProps) => {
    useEffect(() => {
        if (!request) {
            return undefined;
        }
        startEditing();
        // The field stays disabled until the card has re-rendered in edit mode.
        const timer = window.setTimeout(() =>
            form.scrollToField('topicIds', { behavior: 'smooth', block: 'center', inline: 'center', focus: true }),
        );
        return () => window.clearTimeout(timer);
        // Only a new request may trigger the jump, not a new callback identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request]);

    return null;
};
