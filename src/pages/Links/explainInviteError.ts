import type { TFunction } from 'i18next';
import type { AccountInviteTargetRole } from '../../api/accountInvites/accountInvites';
import { FETCH_ERRORS, X_REASON } from '../../api/fetchData';
import {
    extractApiErrorMessageOrNull,
    extractSmtpSendFailure,
    type SmtpSendFailureDetail,
} from '../../utils/extractApiErrorMessage';
import { inviteConflictReasonKey } from './inviteModel';

type Key = [key: string, fallback: string];

export interface InviteErrorContext {
    t: TFunction | ((key: string, fallback?: string, options?: Record<string, unknown>) => string);
    action: 'create' | 'send' | 'resend' | 'selfAssign' | 'topicPermission' | 'roleChange' | 'roleAdd';
    /** Role of the invite, for the 403 fallback. */
    role?: AccountInviteTargetRole;
    /** Which id space a plain 409 on create collided in. */
    idKind?: 'tenant' | 'agency';
}

export interface InviteErrorExplanation {
    /** Full sentence for a toast or an inline hint. */
    message: string;
    /** Short status chip text (CSV preview, tables). */
    label: string;
    status?: number;
    reason?: string;
    emailTaken: boolean;
    smtp: boolean;
    /** An SMTP 502 fails every further row the same way. */
    stopsBatch: boolean;
}

const REASON_LABELS: Record<string, Key> = {
    NO_PENDING_UNIT_ADMIN: [
        'links.csvImport.status.noPendingUnitAdmin',
        'Keine BST-Admin für diese neue Beratungsstelle',
    ],
    UNIT_NOT_CREATED: ['links.inviteError.label.unitNotCreated', 'Beratungsstelle noch nicht angelegt'],
    SELF_ASSIGNMENT_ALREADY_EXISTS: ['links.inviteError.label.alreadyAssigned', 'Bereits eingetragen'],
    CONSULTANT_IDENTITY_ALREADY_GRANTED: ['links.inviteError.label.alreadyAssigned', 'Bereits eingetragen'],
    INVITE_ALREADY_ACCEPTED: ['links.inviteError.label.alreadyAccepted', 'Bereits angenommen'],
    INVITE_NOT_PENDING: ['links.inviteError.label.notPending', 'Nicht mehr aktiv'],
    ROLE_CHANGE_NEEDS_NEW_INVITE: ['links.inviteError.label.needsNewInvite', 'Neue Einladung nötig'],
    ONLY_UNIT_ADMIN: ['links.inviteError.label.onlyUnitAdmin', 'Einzige BST-Admin'],
    ROLE_ALREADY_GRANTED: ['links.inviteError.label.roleAlreadyGranted', 'Rolle schon vorhanden'],
};

const SMTP_MESSAGES: Record<SmtpSendFailureDetail, Key> = {
    SMTP_CREDENTIALS_MISSING: [
        'links.accountInvites.smtpCredentialsMissing',
        'E-Mail-Versand nicht konfiguriert: SMTP-Zugangsdaten fehlen. Bitte Plattform-Admin kontaktieren.',
    ],
    SMTP_DISABLED_OR_INCOMPLETE: [
        'links.accountInvites.smtpDisabledOrIncomplete',
        'E-Mail-Versand ist deaktiviert oder unvollständig konfiguriert. Bitte Plattform-Admin kontaktieren.',
    ],
    SMTP_SETTINGS_UNAVAILABLE: [
        'links.accountInvites.smtpSettingsUnavailable',
        'E-Mail-Einstellungen konnten nicht geladen werden. Bitte später erneut versuchen oder Plattform-Admin kontaktieren.',
    ],
    SMTP_TRANSPORT_FAILED: [
        'links.accountInvites.smtpTransportFailed',
        'E-Mail-Server hat den Versand abgelehnt. Bitte Plattform-Admin kontaktieren.',
    ],
};
const SMTP_FALLBACK: Key = [
    'links.accountInvites.smtpSendFailed',
    'E-Mail konnte nicht versendet werden. Bitte Plattform-Admin kontaktieren.',
];

const ACTION_FALLBACKS: Record<InviteErrorContext['action'], Key> = {
    create: ['links.accountInvites.createFailed', 'Einladung konnte nicht angelegt werden.'],
    send: ['links.accountInvites.sendFailed', 'Einladung konnte nicht versendet werden.'],
    resend: ['links.accountInvites.resendFailed', 'Die Einladung konnte nicht erneut gesendet werden.'],
    selfAssign: ['links.selfAssign.failed', 'Eintragen hat nicht geklappt. Bitte erneut versuchen.'],
    topicPermission: [
        'links.accountInvites.topicPermissionFailed',
        'Die Themen-Berechtigung konnte nicht geändert werden.',
    ],
    roleChange: ['links.accountInvites.roleChangeFailed', 'Die Rolle konnte nicht geändert werden.'],
    roleAdd: ['links.accountInvites.roleAddFailed', 'Die Rolle konnte nicht hinzugefügt werden.'],
};

const forbiddenFallback = ({ action, role }: InviteErrorContext): Key => {
    if (action === 'roleChange' || action === 'roleAdd') {
        return ['links.accountInvites.forbiddenRole', 'Ihre Rolle ist nicht berechtigt, diese Rolle zu vergeben.'];
    }
    if (action === 'selfAssign') {
        return [
            'links.selfAssign.forbidden',
            'In dieser Beratungsstelle dürfen Sie sich nicht in dieser Rolle eintragen.',
        ];
    }
    if (role === 'TENANT_ADMIN') {
        return [
            'links.accountInvites.forbiddenTenantAdmin',
            'Nur Plattform-Administratoren können Träger-Admins einladen.',
        ];
    }
    if (role === 'AGENCY_ADMIN') {
        return ['links.accountInvites.forbiddenAgencyAdmin', 'Ihre Rolle ist nicht berechtigt, BST-Admins einzuladen.'];
    }
    return ['links.accountInvites.forbiddenCounsellor', 'Ihre Rolle ist nicht berechtigt, Berater:innen einzuladen.'];
};

const statusOf = (error: unknown): number | undefined => {
    if (error instanceof Response) return error.status;
    if (error instanceof Error && error.message === FETCH_ERRORS.NO_MATCH) return 404;
    return undefined;
};

/** One German explanation for every invite, send and self-assignment failure. */
export const explainInviteError = async (
    error: unknown,
    context: InviteErrorContext,
): Promise<InviteErrorExplanation> => {
    const { t } = context;
    const say = ([key, fallback]: Key, options?: Record<string, unknown>) => String(t(key, fallback, options));
    const status = statusOf(error);
    const reason = error instanceof Response ? error.headers.get(FETCH_ERRORS.X_REASON) ?? undefined : undefined;
    const base = { status, reason, emailTaken: false, smtp: false, stopsBatch: false };

    if (status === 409 && reason === X_REASON.EMAIL_NOT_AVAILABLE) {
        return {
            ...base,
            emailTaken: true,
            label: say(['links.csvImport.status.emailTaken', 'E-Mail-Adresse bereits vorhanden']),
            message: say([
                'links.composer.emailTaken',
                'Diese E-Mail-Adresse wird bereits für ein bestehendes Konto oder eine bestehende Einladung verwendet. Bitte eine andere Adresse verwenden.',
            ]),
        };
    }
    const known = status === 409 ? inviteConflictReasonKey(reason) : undefined;
    if (known && reason) {
        return { ...base, message: say(known), label: say(REASON_LABELS[reason] ?? known) };
    }
    // Only a create allocates an id, so only there a bare 409 means "number taken".
    if (status === 409 && context.action === 'create') {
        const idLabel =
            context.idKind === 'tenant'
                ? say(['links.accountInvites.tenantId', 'Träger-ID'])
                : say(['links.accountInvites.agencyId', 'Beratungsstellen-ID']);
        return {
            ...base,
            label: say(['links.csvImport.status.idTaken', '{{idLabel}} vergeben'], { idLabel }),
            message:
                context.idKind === 'tenant'
                    ? say(['links.accountInvites.tenantIdTaken', 'Diese Träger-ID ist bereits vergeben.'])
                    : say(['links.accountInvites.agencyIdTaken', 'Diese Beratungsstellen-Nr. ist bereits vergeben.']),
        };
    }
    if (status === 502) {
        const failure = await extractSmtpSendFailure(error);
        if (failure) {
            return {
                ...base,
                smtp: true,
                stopsBatch: true,
                label: say(['links.inviteError.label.smtp', 'Versand fehlgeschlagen']),
                message: say((failure.detail && SMTP_MESSAGES[failure.detail]) || SMTP_FALLBACK),
            };
        }
    }
    // A 403 can be one row's foreign unit, so it fails only that row.
    if (status === 403) {
        return {
            ...base,
            label: say(['links.csvImport.status.forbidden', 'Nicht berechtigt']),
            message: (await extractApiErrorMessageOrNull(error)) ?? say(forbiddenFallback(context)),
        };
    }
    if (status === 400) {
        return {
            ...base,
            label: say(['links.inviteError.label.badRequest', 'Ungültige Angaben']),
            message:
                (await extractApiErrorMessageOrNull(error)) ??
                say(
                    context.action === 'create'
                        ? [
                              'links.inviteError.badRequest',
                              'Die Angaben wurden abgelehnt. Bitte Rolle, Träger und Beratungsstelle prüfen.',
                          ]
                        : ACTION_FALLBACKS[context.action],
                ),
        };
    }
    if (status === 404 && context.action === 'roleAdd') {
        return {
            ...base,
            label: say(['links.inviteError.label.notFound', 'Nicht gefunden']),
            message: say([
                'links.inviteError.accountNotFound',
                'Dieses Konto gibt es nicht mehr oder es ist zum Löschen vorgemerkt.',
            ]),
        };
    }
    if (status === 404) {
        return {
            ...base,
            label: say(['links.inviteError.label.notFound', 'Nicht gefunden']),
            message: say([
                'links.inviteError.notFound',
                'Diese Beratungsstelle bzw. diesen Träger gibt es nicht (mehr). Bitte neu auswählen.',
            ]),
        };
    }
    return {
        ...base,
        label: say(['links.csvImport.status.failed', 'Fehlgeschlagen']),
        message: say(ACTION_FALLBACKS[context.action]),
    };
};
