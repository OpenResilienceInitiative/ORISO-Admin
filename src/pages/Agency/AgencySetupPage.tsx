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
const AssignedAgencySetup = ({ id }: { id: string }) => {
    const { data, isLoading, error, refetch } = useAgencyData({ id });
    const { mutateAsync, isPending } = useAgencyUpdate(id);
    const [saveFailed, setSaveFailed] = useState(false);
    const { t } = useTranslation();
    const navigate = useNavigate();
    if (isLoading) return <Initialization />;
    if (error instanceof AgencyAccessError || !data || validAgencySetupId(data.id) !== id)
        return (
            <Recovery
                retry={() => {
                    refetch();
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
            // Keep this Form mounted: query recovery must not discard the user's input.
            setSaveFailed(true);
        }
    };

    return (
        <ThemeProvider theme={orisoMuiTheme}>
            <div className={styles.setup}>
                <Form layout="vertical" initialValues={data} onFinish={save} scrollToFirstError>
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
export const AgencySetupPage = () => {
    const { id: rawId } = useParams();
    const id = validAgencySetupId(rawId);
    const { hasRole, isTechnicalAccount, tokenUnreadable } = useUserRoles();
    const { data, isLoading, isFetching, isFetchedAfterMount, isError, refetch } = useUserData({
        refetchOnMount: 'always',
    });
    if (isLoading || (!isFetchedAfterMount && isFetching)) return <Initialization />;
    const assigned =
        Array.isArray(data?.agencies) &&
        data.agencies.some((agency: { id?: unknown }) => validAgencySetupId(agency?.id) === id);
    if (!id || tokenUnreadable || isTechnicalAccount || !isAgencyScopedAdmin(hasRole) || isError || !assigned) {
        return (
            <Recovery
                retry={() => {
                    refetch();
                }}
            />
        );
    }
    return <AssignedAgencySetup key={id} id={id} />;
};
