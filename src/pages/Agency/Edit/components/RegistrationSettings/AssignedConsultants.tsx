import { useMemo, useState } from 'react';
import { notification } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InputChipPicker } from '../../../../../components/InputChipPicker';
import { Modal } from '../../../../../components/Modal';
import { X_REASON } from '../../../../../api/fetchData';
import { AgencyConsultant } from '../../../../../api/agency/getAgencyConsultants';
import { unassignAgencyFromConsultant } from '../../../../../api/agency/unassignAgencyFromConsultant';
import { AGENCY_CONSULTANTS_KEY, useAgencyConsultants } from '../../../../../hooks/useAgencyConsultants';
import { extractApiErrorReason } from '../../../../../utils/extractApiErrorMessage';
import styles from './styles.module.scss';

export const consultantDisplayName = ({ firstname, lastname, email }: AgencyConsultant) =>
    [firstname, lastname].filter(Boolean).join(' ') || email || '';

interface AssignedConsultantsProps {
    agencyId: string;
    /** The registration card is in edit mode; removal is offered only then. */
    editing: boolean;
}

/**
 * Who is already assigned to this Beratungsstelle, with a remove action. The add picker
 * next to it only ever showed new picks, so admins could not see existing assignments —
 * including agency admins created "auch als Berater*in" (#1069).
 */
export const AssignedConsultants = ({ agencyId, editing }: AssignedConsultantsProps) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { data: consultants = [], isLoading, isError } = useAgencyConsultants({ id: agencyId });
    const [pendingRemoval, setPendingRemoval] = useState<AgencyConsultant | null>(null);

    const options = useMemo(
        () => consultants.map((consultant, index) => ({ value: index, label: consultantDisplayName(consultant) })),
        [consultants],
    );

    const removal = useMutation({
        mutationFn: (consultant: AgencyConsultant) => unassignAgencyFromConsultant(agencyId, consultant.id),
        onSuccess: (_result, consultant) => {
            notification.success({
                message: t('agency.form.registrationSettings.assigned.removed', {
                    name: consultantDisplayName(consultant),
                }),
                duration: 3,
            });
        },
        onError: async (error, consultant) => {
            const reason = await extractApiErrorReason(error);
            notification.error({
                message:
                    reason === X_REASON.CONSULTANT_IS_THE_LAST_OF_AGENCY_AND_AGENCY_IS_STILL_ACTIVE
                        ? t('agency.form.registrationSettings.assigned.removeLast')
                        : t('agency.form.registrationSettings.assigned.removeFailed', {
                              name: consultantDisplayName(consultant),
                          }),
                duration: 8,
            });
        },
        onSettled: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: [AGENCY_CONSULTANTS_KEY, agencyId] }),
                queryClient.invalidateQueries({ queryKey: ['HAS_CONSULTANTS'] }),
            ]),
    });

    const onChipsChange = (remaining: number[]) => {
        const removed = options.find(({ value }) => !remaining.includes(value));
        if (removed) {
            setPendingRemoval(consultants[removed.value]);
        }
    };

    const title = t('agency.form.registrationSettings.assigned.title');

    return (
        <div className={styles.assigned}>
            <p className={styles.assignedTitle}>{title}</p>
            {isError && <p>{t('agency.form.registrationSettings.assigned.loadError')}</p>}
            {!isError && !isLoading && consultants.length === 0 && (
                <p className={styles.assignedEmpty}>{t('agency.form.registrationSettings.assigned.empty')}</p>
            )}
            {consultants.length > 0 && (
                <InputChipPicker
                    ariaLabel={title}
                    options={options}
                    value={options.map(({ value }) => value)}
                    onChange={onChipsChange}
                    addLabel=""
                    removeLabel={(name) => t('agency.form.registrationSettings.assigned.remove', { name })}
                    disabled={!editing || removal.isPending}
                />
            )}
            {pendingRemoval && (
                <Modal
                    titleKey="agency.form.registrationSettings.assigned.removeConfirm.title"
                    contentKey="agency.form.registrationSettings.assigned.removeConfirm.text"
                    contentKeyOptions={{ name: consultantDisplayName(pendingRemoval) }}
                    cancelLabelKey="btn.cancel"
                    okLabelKey="agency.form.registrationSettings.assigned.removeConfirm.confirm"
                    onConfirm={() => {
                        removal.mutate(pendingRemoval);
                        setPendingRemoval(null);
                    }}
                    onClose={() => setPendingRemoval(null)}
                />
            )}
        </div>
    );
};
