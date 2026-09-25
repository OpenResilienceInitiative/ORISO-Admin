import { Link, useInRouterContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AccountInviteDTO } from '../../../api/accountInvites/accountInvites';
import routePathNames from '../../../appConfig';
import { ROLE_LABEL_KEYS, type InviteRole, type InviteViewerScope } from '../inviteModel';
import { roleMenuFor, type InviteTab, type RoleLockReason, type RoleMenu } from '../inviteRules';
import { RowChipMenu, type RowChipOption } from './RowChipMenu';
import styles from './inviteProgressBoard.module.scss';

const USERS_AREA_KEY = 'usersArea';

const ROLE_MEANING_KEYS: Record<InviteRole, [key: string, fallback: string]> = {
    COUNSELLOR: ['links.inviteProgress.roleMeaning.COUNSELLOR', 'Berät Ratsuchende in ihrer Beratungsstelle.'],
    AGENCY_ADMIN: [
        'links.inviteProgress.roleMeaning.AGENCY_ADMIN',
        'Verwaltet die Beratungsstelle: Berater:innen, Themen und Einstellungen.',
    ],
    TENANT_ADMIN: [
        'links.inviteProgress.roleMeaning.TENANT_ADMIN',
        'Verwaltet den Träger und alle seine Beratungsstellen.',
    ],
};

const CHANGE_HINT_KEYS: Record<RoleMenu['mode'] | RoleLockReason | 'noHandler', [key: string, fallback: string]> = {
    change: ['links.inviteProgress.roleHint.change', 'Noch nicht angenommen: Die Rolle lässt sich hier ändern.'],
    add: [
        'links.inviteProgress.roleHint.add',
        'Das Konto besteht: Hier lässt sich nur „auch BST-Admin“ ergänzen. Rollen entfernen Sie im Bereich Benutzer.',
    ],
    locked: ['links.inviteProgress.roleHint.locked', 'Die Rolle lässt sich nicht mehr ändern.'],
    inactive: [
        'links.inviteProgress.roleHint.inactive',
        'Die Einladung ist nicht mehr aktiv: Die Rolle lässt sich nicht mehr ändern.',
    ],
    foundsTenant: [
        'links.inviteProgress.roleHint.foundsTenant',
        'Die Person gründet den Träger: Die Rolle steht fest.',
    ],
    notInvitable: ['links.inviteProgress.roleHint.notInvitable', 'Diese Rolle dürfen Sie nicht vergeben.'],
    needsNewInvite: [
        'links.inviteProgress.roleHint.needsNewInvite',
        'Träger-Admin hat eine eigene Einladung: widerrufen und neu einladen.',
    ],
    accountPending: ['links.inviteProgress.roleHint.accountPending', 'Das Konto wird noch angelegt.'],
    accountExists: ['links.inviteProgress.roleHint.accountExists', 'Das Konto besteht: im Bereich Benutzer ändern.'],
    alreadyHasRole: ['links.inviteProgress.roleHint.alreadyHasRole', 'Das Konto hat diese Rolle schon.'],
    noHandler: [
        'links.inviteProgress.roleHint.noHandler',
        'Sie haben keine Berechtigung, die Rolle dieser Person zu ändern.',
    ],
};

/** The users area as a real link: inside the app a router link, a plain anchor elsewhere (tests, isolated stories). */
const UsersAreaLink = ({ children }: { children: string }) =>
    useInRouterContext() ? (
        <Link to={routePathNames.consultants}>{children}</Link>
    ) : (
        <a href={routePathNames.consultants}>{children}</a>
    );

export interface RoleChipProps {
    invite: Pick<AccountInviteDTO, 'targetRole' | 'inviteStatus' | 'tenantIdAllocationMode' | 'provisionedUserId'>;
    displayName: string;
    /** Roles this session added to the account; the list does not carry them. */
    grantedRoles?: InviteRole[];
    viewer: InviteViewerScope;
    tab: InviteTab;
    saving?: boolean;
    /** Without a handler the matching entries stay visible but disabled. */
    onChangeRole?: (role: InviteRole) => void;
    onAddRole?: (role: InviteRole) => void;
}

/** The invited role as a chip: the menu changes it before acceptance and adds "auch BST-Admin" after. */
export const RoleChip = ({
    invite,
    displayName,
    viewer,
    tab,
    grantedRoles = [],
    saving = false,
    onChangeRole,
    onAddRole,
}: RoleChipProps) => {
    const { t } = useTranslation();
    const menu = roleMenuFor(invite, viewer, tab, { grantedRoles });
    const roleLabel = (role: InviteRole) => t(...ROLE_LABEL_KEYS[role]);
    const current = invite.targetRole as InviteRole;
    const extra = invite.targetRole === 'COUNSELLOR' && grantedRoles.includes('AGENCY_ADMIN');
    const label = extra ? `${roleLabel(current)} + ${roleLabel('AGENCY_ADMIN')}` : roleLabel(current);

    const handlerFor = (action: 'change' | 'add') => (action === 'change' ? onChangeRole : onAddRole);
    const usable = menu.entries.some((entry) => !entry.disabledReason && !entry.current && handlerFor(entry.action));
    const disabled = saving || !usable;

    let hint = CHANGE_HINT_KEYS[menu.lockedReason ?? menu.mode];
    if (!menu.lockedReason && !usable && !saving) hint = CHANGE_HINT_KEYS.noHandler;
    const tooltip = `${label}: ${t(...ROLE_MEANING_KEYS[current])} ${t(...hint)}`;

    const options: Array<RowChipOption | 'divider'> = menu.entries.map((entry) => {
        const reason = entry.disabledReason ?? (handlerFor(entry.action) ? undefined : 'noHandler');
        return {
            key: `${entry.action}:${entry.role}`,
            title:
                entry.action === 'add'
                    ? t('links.inviteProgress.roleAdd', '+ auch {{role}}', { role: roleLabel(entry.role) })
                    : roleLabel(entry.role),
            description:
                reason && !entry.current ? t(...CHANGE_HINT_KEYS[reason]) : t(...ROLE_MEANING_KEYS[entry.role]),
            checked: entry.current,
            disabled: reason != null && !entry.current,
        };
    });
    if (menu.pointsToUsers) {
        options.push('divider', {
            key: USERS_AREA_KEY,
            title: '',
            content: (
                <span className={styles.roleUsersLink}>
                    <UsersAreaLink>
                        {t('links.inviteProgress.roleRemoveInUsers', 'Rolle entfernen: im Bereich Benutzer')}
                    </UsersAreaLink>
                </span>
            ),
        });
    }

    return (
        <RowChipMenu
            className={styles.roleChip}
            label={label}
            ariaLabel={`${t('links.inviteProgress.roleFor', 'Rolle von {{name}}', { name: displayName })}: ${label}`}
            tooltip={tooltip}
            disabled={disabled}
            options={options}
            onSelect={(key) => {
                if (key === USERS_AREA_KEY) return;
                const [action, role] = key.split(':') as ['change' | 'add', InviteRole];
                handlerFor(action)?.(role);
            }}
        />
    );
};
