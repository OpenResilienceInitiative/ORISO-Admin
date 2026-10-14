import { useState } from 'react';
import type { InviteEmailTemplateKind } from '../../api/accountInvites/accountInvites';

export interface InviteTemplateIdentity {
    issuer: string;
    subject: string;
}

export const inviteTemplateRecentsKey = (identity: InviteTemplateIdentity, kind: InviteEmailTemplateKind) =>
    `oriso-admin.invite-template-recents.${encodeURIComponent(identity.issuer)}.${encodeURIComponent(
        identity.subject,
    )}.${kind}`;

const read = (key: string | undefined): number[] => {
    if (!key) return [];
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
        if (!Array.isArray(stored)) return [];
        return [...new Set(stored.filter((id): id is number => Number.isSafeInteger(id) && id > 0))].slice(0, 4);
    } catch {
        return [];
    }
};

/** Only explicit user choices count; automatic defaults never become recent choices. */
export const useInviteTemplateRecents = (
    identity: InviteTemplateIdentity | undefined,
    kind: InviteEmailTemplateKind,
) => {
    const key = identity ? inviteTemplateRecentsKey(identity, kind) : undefined;
    const [state, setState] = useState(() => ({ key, ids: read(key) }));
    // Switching principal must not show the previous user's history even for one render.
    const ids = state.key === key ? state.ids : read(key);
    const remember = (id: number) => {
        if (!key || !Number.isSafeInteger(id) || id <= 0) return;
        setState((current) => {
            const previous = current.key === key ? current.ids : read(key);
            const next = [id, ...previous.filter((previousId) => previousId !== id)].slice(0, 4);
            try {
                localStorage.setItem(key, JSON.stringify(next));
            } catch {
                // Unavailable storage: keep this account's choice for this mounted view only.
            }
            return { key, ids: next };
        });
    };
    return { ids, remember };
};
