import { message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    acceptBaseUrlForRole,
    resendAccountInvite,
    revokeAccountInvite,
    sendAccountInvite,
    type AccountInviteDTO,
    type AccountInviteTargetRole,
} from '../../api/accountInvites/accountInvites';
import type { InviteErrorContext, InviteErrorExplanation } from './explainInviteError';
import { isBulkSelectable } from './inviteRules';

interface UseInviteBulkOptions {
    invites: AccountInviteDTO[];
    reload: () => Promise<void>;
    explain: (
        error: unknown,
        action: InviteErrorContext['action'],
        role?: AccountInviteTargetRole,
    ) => Promise<InviteErrorExplanation>;
    rememberGeneratedLink: (invite: AccountInviteDTO) => void;
}

/** The checked rows and what can be done with them: send and revoke, one request per row. */
export const useInviteBulk = ({ invites, reload, explain, rememberGeneratedLink }: UseInviteBulkOptions) => {
    const { t } = useTranslation();
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);
    const [running, setRunning] = useState(false);

    // A reload drops ids that are no longer listed or selectable, so a bulk action never hits a stale row.
    useEffect(() => {
        setSelectedIds((current) =>
            current.filter((id) => invites.some((invite) => invite.id === id && isBulkSelectable(invite))),
        );
    }, [invites]);

    const selectedInvites = useMemo(
        () => invites.filter((invite) => selectedIds.includes(invite.id) && isBulkSelectable(invite)),
        [invites, selectedIds],
    );

    const requiresTemplate = selectedInvites.some((invite) => invite.onboardingPurpose !== 'EXISTING_ACCOUNT_SETUP');

    // Revoke is the delete here; failures are collected into one summary.
    const revokeConfirmed = useCallback(async () => {
        setConfirmRevokeOpen(false);
        const targets = selectedInvites;
        if (targets.length === 0) return;
        setRunning(true);
        const failedEmails: string[] = [];
        for (let i = 0; i < targets.length; i += 1) {
            try {
                // eslint-disable-next-line no-await-in-loop -- sequential on purpose: per-row attribution, no backend burst
                await revokeAccountInvite(targets[i].id);
            } catch {
                failedEmails.push(targets[i].recipientEmail);
            }
        }
        setRunning(false);
        if (failedEmails.length === 0) {
            message.success(
                t('links.bulk.revokeSummaryAll', '{{count}} Einladungen widerrufen', { count: targets.length }),
            );
        } else {
            message.warning(
                t('links.bulk.revokeSummaryPartial', '{{revoked}} widerrufen, {{failed}} fehlgeschlagen: {{emails}}', {
                    revoked: targets.length - failedEmails.length,
                    failed: failedEmails.length,
                    emails: failedEmails.join(', '),
                }),
            );
        }
        setSelectedIds([]);
        await reload();
    }, [reload, selectedInvites, t]);

    // Setup rows always use their purpose-safe resend. An ordinary never-mailed DRAFT uses send.
    // Failed rows stay selected for a retry.
    const send = useCallback(
        async (templateId: number | undefined) => {
            const targets = selectedInvites;
            if (targets.length === 0) return;
            // Setup mail is canonical; ordinary invitations still need an explicit template.
            if (requiresTemplate && !templateId) {
                message.error(t('links.accountInvites.templateRequired', 'Select a template first.'));
                return;
            }
            setRunning(true);
            const failed: AccountInviteDTO[] = [];
            // The first explained cause is shown once, above the count summary.
            let firstCause: string | null = null;
            for (let i = 0; i < targets.length; i += 1) {
                try {
                    const target = targets[i];
                    const setup = target.onboardingPurpose === 'EXISTING_ACCOUNT_SETUP';
                    const deliver = target.inviteStatus === 'DRAFT' ? sendAccountInvite : resendAccountInvite;
                    const delivery = setup
                        ? resendAccountInvite(target.id, undefined)
                        : deliver(target.id, {
                              acceptBaseUrl: acceptBaseUrlForRole(target.targetRole),
                              templateId,
                          });
                    // eslint-disable-next-line no-await-in-loop -- sequential on purpose: per-row attribution, no mail burst
                    const delivered = await delivery;
                    rememberGeneratedLink(delivered);
                } catch (error) {
                    failed.push(targets[i]);
                    // eslint-disable-next-line no-await-in-loop -- reads the failed response body
                    const explained = await explain(
                        error,
                        targets[i].onboardingPurpose !== 'EXISTING_ACCOUNT_SETUP' && targets[i].inviteStatus === 'DRAFT'
                            ? 'send'
                            : 'resend',
                        targets[i].targetRole,
                    );
                    if (explained.status != null) firstCause ??= explained.message;
                    if (explained.stopsBatch) {
                        failed.push(...targets.slice(i + 1));
                        break;
                    }
                }
            }
            setRunning(false);
            if (firstCause) message.error(firstCause);
            if (failed.length === 0) {
                message.success(
                    t('links.bulk.sendSummaryAll', '{{count}} Einladungen gesendet', { count: targets.length }),
                );
                setSelectedIds([]);
            } else {
                message.warning(
                    t('links.bulk.sendSummaryPartial', '{{sent}} gesendet, {{failed}} fehlgeschlagen: {{emails}}', {
                        sent: targets.length - failed.length,
                        failed: failed.length,
                        emails: failed.map((invite) => invite.recipientEmail).join(', '),
                    }),
                );
                setSelectedIds(failed.map((invite) => invite.id));
            }
            await reload();
        },
        [explain, reload, rememberGeneratedLink, requiresTemplate, selectedInvites, t],
    );

    return {
        selectedIds,
        setSelectedIds,
        selectedInvites,
        requiresTemplate,
        running,
        confirmRevokeOpen,
        setConfirmRevokeOpen,
        revokeConfirmed,
        send,
    };
};
