import { acceptBaseUrlForRole, type CreateAccountInviteRequest } from '../../api/accountInvites/accountInvites';
import type { IdFieldMode } from '../../components/IdAllocationField';
import type { InviteSuggestion } from '../../components/OnboardingDesign/InviteSuggestionDialog';
import { normaliseAvatarValue } from '../../utils/counsellorAvatar';
import type { InviteRole, InviteSendMode, InviteViewerScope, TopicPermission } from './inviteModel';
import { allocationModeOf, fieldsForRole, type InviteTab } from './inviteRules';

export interface InviteUnit {
    mode: IdFieldMode;
    id?: number;
}

/** What the bar holds when the admin presses send. */
export interface InviteDraft {
    kind: 'draft';
    role: InviteRole;
    recipientEmail: string;
    firstName?: string;
    lastName?: string;
    tenant: InviteUnit;
    agency: InviteUnit;
    alsoCounsellor: boolean;
    topicPermission: TopicPermission;
    templateId?: number;
    /** Optional icon and display name the invitee starts with (#1274); counsellor tab only. */
    suggestion?: InviteSuggestionFields;
}

/** Wire form of the suggestion; each field is left out when empty. */
export type InviteSuggestionFields = Pick<CreateAccountInviteRequest, 'avatarKind' | 'avatarId' | 'displayName'>;

/** One CSV row after the preview resolved its id, role and template. */
export const NO_INVITE_SUGGESTION: InviteSuggestion = { avatar: {}, displayName: '' };

const MAX_SUGGESTED_NAME_LENGTH = 100;

/** The dialog's choice in wire form: a half-chosen icon becomes initials, empty parts are left out. */
export const toSuggestionFields = ({ avatar, displayName }: InviteSuggestion): InviteSuggestionFields => {
    const { avatarKind, avatarId } = normaliseAvatarValue(avatar);
    const name = displayName.trim().slice(0, MAX_SUGGESTED_NAME_LENGTH);
    return {
        ...(avatarKind ? { avatarKind } : {}),
        ...(avatarKind && avatarId ? { avatarId } : {}),
        ...(name ? { displayName: name } : {}),
    };
};

export interface InviteCsvCreateRow {
    recipientEmail: string;
    firstName?: string;
    lastName?: string;
    /** The file's id, or the batch-assigned one on the Träger tab. */
    id?: number;
    target: 'NEW' | 'EXISTING';
    role: InviteRole;
    /** `undefined` = the template chosen in the bar. */
    templateId?: number;
    /** `undefined` = omitted, the server decides. */
    topicPermission?: TopicPermission;
    alsoCounsellor?: boolean;
}

export interface InviteRequestContext {
    tab: InviteTab;
    viewer: InviteViewerScope;
    sendMode: InviteSendMode;
    /** The viewer's own Träger, which CSV rows on the counsellor tab join. */
    ownTenantId?: number;
    /** A CSV row without its own template sends with this one. */
    fallbackTemplateId?: number;
}

type UnitFields = Pick<
    CreateAccountInviteRequest,
    'tenantId' | 'tenantIdAllocationMode' | 'agencyId' | 'agencyIdAllocationMode'
>;

const draftUnits = (draft: InviteDraft, { tab, viewer }: InviteRequestContext): UnitFields => {
    // A new Träger is founded only on the Träger tab; elsewhere only a chosen Träger carries a mode.
    const tenantFounding = tab === 'tenant' && viewer === 'platform';
    const units: UnitFields = {
        tenantId: draft.tenant.id,
        tenantIdAllocationMode:
            tenantFounding || draft.tenant.mode === 'existing' ? allocationModeOf(draft.tenant.mode) : undefined,
    };
    if (fieldsForRole(draft.role, tab).agency) {
        units.agencyId = draft.agency.id;
        units.agencyIdAllocationMode = allocationModeOf(draft.agency.mode);
    }
    return units;
};

const csvUnits = (row: InviteCsvCreateRow, { tab, ownTenantId }: InviteRequestContext): UnitFields => {
    if (tab === 'tenant') {
        // A new Träger with a pinned number is MANUAL, like the bar; an empty cell lets the server pick.
        let tenantIdAllocationMode: UnitFields['tenantIdAllocationMode'] = row.id != null ? 'MANUAL' : 'AUTO';
        if (row.target === 'EXISTING') tenantIdAllocationMode = 'EXISTING';
        return { tenantId: row.id, tenantIdAllocationMode };
    }
    const ownTenant: UnitFields =
        ownTenantId != null ? { tenantId: ownTenantId, tenantIdAllocationMode: 'EXISTING' } : {};
    if (row.role === 'TENANT_ADMIN') return ownTenant;
    // "bestehend" = an existing agency; a number for "neu" is pinned; an empty cell asks for the next free one.
    let agencyIdAllocationMode: UnitFields['agencyIdAllocationMode'] = row.id != null ? 'MANUAL' : 'AUTO';
    if (row.target === 'EXISTING') agencyIdAllocationMode = 'EXISTING';
    return { ...ownTenant, agencyId: row.id, agencyIdAllocationMode };
};

/** The one place an invite request is built, for the bar and for every CSV row. */
export const toCreateInviteRequest = (
    source: InviteDraft | ({ kind: 'csv' } & InviteCsvCreateRow),
    context: InviteRequestContext,
): CreateAccountInviteRequest => {
    const direct = context.sendMode === 'direct';
    const base = {
        acceptBaseUrl: acceptBaseUrlForRole(source.role),
        expiresInDays: 30,
        targetRole: source.role,
        recipientEmail: source.recipientEmail,
        firstName: source.firstName,
        lastName: source.lastName,
    };
    const fields = fieldsForRole(source.role, context.tab);
    if (source.kind === 'csv') {
        return {
            ...base,
            ...csvUnits(source, context),
            alsoCounsellor: fields.alsoCounsellor ? source.alsoCounsellor : undefined,
            topicPermission: fields.topics ? source.topicPermission : undefined,
            templateId: direct ? source.templateId ?? context.fallbackTemplateId : undefined,
        };
    }
    return {
        ...base,
        ...draftUnits(source, context),
        ...(fields.agency ? source.suggestion : undefined),
        alsoCounsellor: fields.alsoCounsellor ? source.alsoCounsellor : undefined,
        topicPermission: fields.topics ? source.topicPermission : undefined,
        templateId: direct ? source.templateId : undefined,
    };
};
