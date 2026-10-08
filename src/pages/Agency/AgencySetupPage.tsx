import { useState } from 'react';
import { Alert, Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { AgencyAccessError } from '../../api/agency/getAgencyById';
import routePathNames from '../../appConfig';
import { validAgencySetupId } from '../../constants/agencySetupContinuation';
import { isAgencyScopedAdmin } from '../../constants/agencyAdminLanding';
import { useUserData } from '../../hooks/useUserData.hook';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { useAgencyData } from '../../hooks/useAgencyData';
import { useAgencyUpdate } from '../../hooks/useAgencyUpdate';
import { Initialization } from '../../components/Layout/Initialization';
import { Card } from '../../components/Card';
import { M3Button } from '../../components/M3Button';
import { AgencyGeneralInformation } from './Edit/components/GeneralInformation';
import { orisoMuiTheme } from '../../theme/orisoMuiTheme';
import type { AgencyData } from '../../types/agency';
import { ReactComponent as CounsellingCentreIcon } from '../../resources/img/svg/navbar/counseling_active.svg';
import styles from './agencySetup.module.scss';

const Recovery = ({ retry }: { retry: () => void }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    return (
        <div className={styles.setup}>
            <Alert type="error" showIcon message={t('agency.setup.unavailable')} />
            <div className={styles.actions}>
                <M3Button variant="outlined" onClick={retry}>
                    {t('agency.setup.retry')}
                </M3Button>
                <M3Button onClick={() => navigate(routePathNames.agency)}>{t('agency.setup.myAgencies')}</M3Button>
            </div>
        </div>
    );
};

/** Rendered only after the authenticated assignment check, before any agency GET. */
const AssignedAgencySetup = ({
    id,
    draft,
    onDraftChange,
    retryAssignment,
}: {
    id: string;
    draft?: Partial<AgencyData>;
    onDraftChange: (changed: Partial<AgencyData>) => void;
    retryAssignment: () => Promise<boolean>;
}) => {
    const { data, isLoading, error, refetch } = useAgencyData({ id });
    const { mutateAsync, isPending } = useAgencyUpdate(id);
    const [saveFailed, setSaveFailed] = useState(false);
    const { t } = useTranslation();
    const navigate = useNavigate();
    if (isLoading) return <Initialization />;
    if (error instanceof AgencyAccessError || !data || validAgencySetupId(data.id) !== id)
        return (
            <Recovery
                retry={async () => {
                    // A retry must recheck assignment before the tenant-filtered GET.
                    if (await retryAssignment()) await refetch();
                }}
            />
        );

    const save = async (values: Partial<AgencyData>) => {
        setSaveFailed(false);
        try {
            // The invite already reserved this ID. The shared mutation merges the narrow
            // information patch into the confirmed snapshot, preserving topics/legal/settings.
            await mutateAsync(values);
            navigate(`${routePathNames.agency}/${id}/general`);
        } catch {
            // The parent retains edits even when denied access temporarily hides this Form.
            setSaveFailed(true);
        }
    };

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <div className={styles.setup}>
                <Form
                    layout="vertical"
                    initialValues={{ ...data, ...draft }}
                    onValuesChange={onDraftChange}
                    onFinish={save}
                    scrollToFirstError
                >
                    <Card
                        autoHeight
                        dialogContentPadding
                        variant="dialog"
                        headerIcon={<CounsellingCentreIcon aria-hidden focusable="false" />}
                        titleKey="agency.setup.title"
                        subTitleKey="agency.setup.description"
                        footer={
                            <M3Button type="submit" variant="filled" loading={isPending}>
                                {t('agency.setup.finish')}
                            </M3Button>
                        }
                    >
                        <AgencyGeneralInformation asFields />
                        {saveFailed && <Alert type="error" showIcon message={t('agency.setup.saveError')} />}
                    </Card>
                </Form>
            </div>
        </ThemeProvider>
    );
};

/** The URL is a hint. Only the signed-in BST admin's actual assignment authorizes access. */
const hasAssignedAgency = (agencies: unknown, id: string | null): boolean =>
    Array.isArray(agencies) && agencies.some((agency: { id?: unknown }) => validAgencySetupId(agency?.id) === id);

export const AgencySetupPage = () => {
    const [draft, setDraft] = useState<{ id: string; values: Partial<AgencyData> } | null>(null);
    const { id: rawId } = useParams();
    const id = validAgencySetupId(rawId);
    const { hasRole, isTechnicalAccount, tokenUnreadable } = useUserRoles();
    const { data, isLoading, isFetching, isFetchedAfterMount, isError, refetch } = useUserData({
        refetchOnMount: 'always',
    });
    if (isLoading || (!isFetchedAfterMount && isFetching)) return <Initialization />;
    const assigned = hasAssignedAgency(data?.agencies, id);
    if (!id || tokenUnreadable || isTechnicalAccount || !isAgencyScopedAdmin(hasRole) || isError || !assigned) {
        return (
            <Recovery
                retry={() => {
                    refetch();
                }}
            />
        );
    }
    return (
        <AssignedAgencySetup
            key={id}
            id={id}
            draft={draft?.id === id ? draft.values : undefined}
            onDraftChange={(changed) =>
                setDraft((previous) => ({
                    id,
                    // Retain edited information only, scoped to this centre and this mounted session.
                    values: { ...(previous?.id === id ? previous.values : {}), ...changed },
                }))
            }
            retryAssignment={async () => {
                const result = await refetch();
                return !result.isError && hasAssignedAgency(result.data?.agencies, id);
            }}
        />
    );
};
