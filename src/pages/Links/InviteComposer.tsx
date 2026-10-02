import { useEffect, useState } from 'react';
import type { CreateAccountInviteRequest } from '../../api/accountInvites/accountInvites';
import type { IdUnitOption } from '../../components/IdAllocationField';
import { InviteBarFields, InviteSendButton, InviteSendHint } from './InviteBar';
import { InvitePanel } from './InvitePanel';
import type { InviteSendMode } from './inviteModel';
import type { InviteTab } from './inviteRules';
import {
    InviteToolbar,
    type InviteBulkProps,
    type InviteCsvProps,
    type InviteSearchProps,
    type InviteTemplatesProps,
} from './InviteToolbar';
import {
    useInviteDraft,
    type InviteClients,
    type InviteInitialValues,
    type InviteSubmitOutcome,
    type InviteViewer,
} from './useInviteDraft';

export type { InviteRole, InviteSendMode, InviteViewerScope, TopicPermission } from './inviteModel';
export type { InviteClients, InviteCreated, InviteSubmitOutcome, InviteViewer } from './useInviteDraft';
export { sendModeStorageKey } from './useInviteDraft';

export interface InviteComposerProps {
    tab: InviteTab;
    /** Keys the persisted send mode, one per tab. */
    persistKey: string;
    viewer: InviteViewer;
    clients?: InviteClients;
    templates: InviteTemplatesProps;
    search?: InviteSearchProps;
    csv?: InviteCsvProps;
    bulk?: InviteBulkProps;
    /** Resolve the created invite (or `true`) to start over; `'emailTaken'` keeps the row and marks the address. */
    onSubmit: (request: CreateAccountInviteRequest) => Promise<InviteSubmitOutcome> | InviteSubmitOutcome;
    /** "Mich selbst eintragen" in the send menu, with the existing agency chosen in the bar. */
    onSelfAssign?: (agency?: IdUnitOption) => void;
    submitting?: boolean;
    /** Prefill; valid prefilled fields start collapsed. */
    initialValues?: InviteInitialValues;
    className?: string;
    /** `toolbar`: one wrapping row with search and ⋮ menu. `panel`: the stacked card beside the table. */
    layout?: 'toolbar' | 'panel';
    /** Panel only: folded to its rail; uncontrolled when omitted. */
    panelCollapsed?: boolean;
    onPanelCollapsedChange?: (next: boolean) => void;
    /** The page's CSV import (outside the panel) needs the chosen send mode. */
    onSendModeChange?: (mode: InviteSendMode) => void;
}

/** The invite row: the bar's fields inside the toolbar, which adds search, CSV, bulk and templates. */
export const InviteComposer = ({
    tab,
    persistKey,
    viewer,
    clients = {},
    templates,
    search,
    csv,
    bulk,
    onSubmit,
    onSelfAssign,
    submitting = false,
    initialValues,
    className,
    layout = 'toolbar',
    panelCollapsed,
    onPanelCollapsedChange,
    onSendModeChange,
}: InviteComposerProps) => {
    const [ownCollapsed, setOwnCollapsed] = useState(false);
    const draft = useInviteDraft({
        tab,
        persistKey,
        viewer,
        clients,
        templates: templates.list,
        templateId: templates.selectedId,
        submitting,
        initialValues,
        onSubmit,
    });
    const hintId = `invite-composer-send-hint-${persistKey}`;
    const sendMode = draft.submit.mode;
    useEffect(() => onSendModeChange?.(sendMode), [onSendModeChange, sendMode]);

    if (layout === 'panel') {
        return (
            <InvitePanel
                bulk={bulk}
                className={className}
                clients={clients}
                collapsed={panelCollapsed ?? ownCollapsed}
                draft={draft}
                hintId={hintId}
                submitting={submitting}
                tab={tab}
                templates={templates}
                onCollapsedChange={onPanelCollapsedChange ?? setOwnCollapsed}
                onSelfAssign={onSelfAssign}
            />
        );
    }

    return (
        <InviteToolbar
            bulk={bulk}
            className={className}
            csv={csv}
            hint={<InviteSendHint draft={draft} hintId={hintId} />}
            rootRef={draft.row.ref}
            search={search}
            send={
                <InviteSendButton draft={draft} hintId={hintId} submitting={submitting} onSelfAssign={onSelfAssign} />
            }
            sendMode={draft.submit.mode}
            submitting={submitting}
            tab={tab}
            templatePill={{
                collapsed: draft.pills.isCollapsed('template'),
                onExpand: () => draft.pills.expand('template'),
                onPicked: () => draft.pills.collapse('template'),
            }}
            templates={templates}
            onFocus={draft.row.onFocus}
        >
            <InviteBarFields clients={clients} draft={draft} />
        </InviteToolbar>
    );
};

export default InviteComposer;
