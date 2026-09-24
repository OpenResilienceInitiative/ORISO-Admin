import type { CreateAccountInviteRequest } from '../../api/accountInvites/accountInvites';
import type { IdUnitOption } from '../../components/IdAllocationField';
import { InviteBarFields, InviteSendButton, InviteSendHint } from './InviteBar';
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
}: InviteComposerProps) => {
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

    return (
        <InviteToolbar
            bulk={bulk}
            className={className}
            csv={csv}
            hint={<InviteSendHint draft={draft} hintId={hintId} />}
            rootRef={draft.rootRef}
            search={search}
            send={
                <InviteSendButton draft={draft} hintId={hintId} submitting={submitting} onSelfAssign={onSelfAssign} />
            }
            sendMode={draft.sendMode}
            submitting={submitting}
            tab={tab}
            templatePill={{
                collapsed: draft.isCollapsed('template'),
                onExpand: () => draft.expand('template'),
                onPicked: () => draft.collapse('template'),
            }}
            templates={templates}
            onFocus={draft.handleRowFocus}
        >
            <InviteBarFields clients={clients} draft={draft} />
        </InviteToolbar>
    );
};

export default InviteComposer;
