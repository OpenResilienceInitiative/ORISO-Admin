import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import type { TenantDpaStatus } from '../../types/dpa';
import { formatBerlinDateTime } from '../Tenants/LegalSettings/utils/utcTimestamp';
import { EditorHelpText } from '../FormPluginEditor/EditorHelpText';

/** Current-version facts reported by the server, shared by readers and legal settings. */
export const DpaDeadlineInfo = ({
    signingDeadlineAt,
    status,
    newCounsellingAllowed,
    renewalGraceActive,
}: {
    signingDeadlineAt?: string | null;
    status?: TenantDpaStatus;
    newCounsellingAllowed?: boolean;
    renewalGraceActive?: boolean;
}) => {
    const { t, i18n } = useTranslation();
    if (!signingDeadlineAt) return null;
    const hints: string[] = [];
    if (status && ['VALID', 'UNSIGNED', 'OUTDATED'].includes(status)) {
        hints.push(t(`legal.dpa.deadline.state.${status}`));
    }
    if (status === 'OUTDATED' && renewalGraceActive === true) hints.push(t('legal.dpa.deadline.grace'));
    if (status === 'OUTDATED' && newCounsellingAllowed === false) hints.push(t('legal.dpa.deadline.blockedRenewal'));
    return (
        <div>
            <EditorHelpText
                text={t('legal.dpa.deadline.label', {
                    deadline: formatBerlinDateTime(signingDeadlineAt, i18n.language),
                })}
                hint={
                    hints.length > 0 ? (
                        <span role="status">
                            {hints.map((hint, index) => (
                                <Fragment key={hint}>
                                    {index > 0 && <br />}
                                    <span>{hint}</span>
                                </Fragment>
                            ))}
                        </span>
                    ) : undefined
                }
            />
        </div>
    );
};
