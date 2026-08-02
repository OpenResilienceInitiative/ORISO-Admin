import { Alert, Button, Table } from 'antd';
import { ColumnProps } from 'antd/lib/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '../../../components/Page';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import {
    SupportAccessRequestResult,
    SupportTarget,
    useRequestSupportAccess,
    useSupportTargets,
} from '../../../hooks/useSupportAccess';
import { RequestSupportAccessModal } from './RequestSupportAccessModal';

const PAGE_SIZE = 10;

const remainingSeconds = (expiryDate?: string) => {
    if (!expiryDate) return 0;
    const remaining = Math.floor((new Date(expiryDate).getTime() - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
};

const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
};

/**
 * The restricted support mode of the Admin board (ADR-018 §6).
 *
 * <p>Only an active Global Support Admin can reach this. The list carries the bare minimum needed to
 * identify a person and an assignment — no cases, no advice seekers, no availability — and the only
 * action is asking that one consultant at that one agency for access.
 */
export const SupportTargets = () => {
    const { t } = useTranslation();
    const { isGlobalSupportAdmin } = useUserRoles();

    const [search] = useState('');
    const [current, setCurrent] = useState(1);
    const [selectedTarget, setSelectedTarget] = useState<SupportTarget | null>(null);
    const [pendingRequest, setPendingRequest] = useState<SupportAccessRequestResult | null>(null);
    const [countdown, setCountdown] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const { data, isLoading } = useSupportTargets({ search, current, pageSize: PAGE_SIZE });

    const requestSupportAccess = useRequestSupportAccess({
        onSuccess: (result) => {
            setSelectedTarget(null);
            setErrorMessage(null);
            setPendingRequest(result);
            setCountdown(remainingSeconds(result.expiryDate));
        },
        onError: (error: unknown) =>
            // A 409 is not a credential problem: a request for this consultant is already open.
            // Blaming password and OTP there sends the admin chasing the wrong thing.
            setErrorMessage(
                (error as { status?: number })?.status === 409
                    ? t('supportAccess.request.duplicate')
                    : t('supportAccess.request.failed'),
            ),
    });

    useEffect(() => {
        if (!pendingRequest) return undefined;
        const timer = window.setInterval(() => {
            const next = remainingSeconds(pendingRequest.expiryDate);
            setCountdown(next);
            // The request is gone server-side once the window closes; stop claiming it is pending.
            if (next === 0) {
                window.clearInterval(timer);
            }
        }, 1000);
        return () => window.clearInterval(timer);
    }, [pendingRequest]);

    const handleSubmit = useCallback(
        (credentials: { password: string; otp: string }) => {
            if (!selectedTarget) return;
            requestSupportAccess.mutate({
                consultantId: selectedTarget.consultantId,
                agencyId: selectedTarget.agencyId,
                ...credentials,
            });
        },
        [requestSupportAccess, selectedTarget],
    );

    const columns = useMemo<Array<ColumnProps<SupportTarget>>>(() => {
        const base: Array<ColumnProps<SupportTarget>> = [
            { key: 'lastName', dataIndex: 'lastName', title: t('lastname') },
            { key: 'firstName', dataIndex: 'firstName', title: t('firstname') },
            { key: 'email', dataIndex: 'email', title: t('email') },
            { key: 'agencyId', dataIndex: 'agencyId', title: t('supportAccess.targets.agency') },
        ];

        // ADR-018: the support column is not rendered at all for anyone else — hidden, not
        // disabled, so it never appears in the DOM of a non-support account.
        if (!isGlobalSupportAdmin) {
            return base;
        }

        return [
            ...base,
            {
                key: 'support',
                title: '',
                width: 180,
                render: (_: unknown, record: SupportTarget) => (
                    <Button
                        type="link"
                        data-cy="support-request-button"
                        disabled={Boolean(pendingRequest) && countdown > 0}
                        onClick={() => {
                            setErrorMessage(null);
                            setSelectedTarget(record);
                        }}
                    >
                        {t('supportAccess.targets.request')}
                    </Button>
                ),
            },
        ];
    }, [countdown, isGlobalSupportAdmin, pendingRequest, t]);

    if (!isGlobalSupportAdmin) {
        return (
            <Page>
                <Alert type="error" showIcon message={t('supportAccess.targets.forbidden')} />
            </Page>
        );
    }

    return (
        <Page>
            <Page.Title titleKey="supportAccess.targets.title" />
            {pendingRequest && (
                <Alert
                    type={countdown > 0 ? 'info' : 'warning'}
                    showIcon
                    style={{ marginBottom: 16 }}
                    data-cy="support-request-status"
                    message={
                        countdown > 0
                            ? t('supportAccess.request.waiting', { countdown: formatCountdown(countdown) })
                            : t('supportAccess.request.lapsed')
                    }
                    description={
                        countdown > 0 ? (
                            <>
                                <div>{t('supportAccess.request.waiting.description')}</div>
                                {/* Same-origin: the counselling app is served next to /admin, so the
                                    existing session carries over and no second sign-in is needed.
                                    The room only exists once the consultant confirms. */}
                                <a href="/support" data-cy="support-session-link">
                                    {t('supportAccess.request.openSupportView')}
                                </a>
                            </>
                        ) : undefined
                    }
                />
            )}
            <Table
                loading={isLoading}
                rowKey={(record) => `${record.consultantId}-${record.agencyId}`}
                columns={columns}
                dataSource={data?.data ?? []}
                locale={{ emptyText: t('supportAccess.targets.empty') }}
                pagination={{
                    current,
                    pageSize: PAGE_SIZE,
                    total: data?.total ?? 0,
                    onChange: setCurrent,
                    showSizeChanger: false,
                }}
            />
            <RequestSupportAccessModal
                target={selectedTarget}
                pending={requestSupportAccess.isPending}
                errorMessage={errorMessage}
                onCancel={() => setSelectedTarget(null)}
                onSubmit={handleSubmit}
            />
        </Page>
    );
};
