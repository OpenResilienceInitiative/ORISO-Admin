import { FETCH_ERRORS } from '../fetchData';

/**
 * What still belongs to a Träger and therefore blocks its deletion (ORISO-UserService#1466).
 *
 * TenantService refuses `DELETE /service/tenant/{id}` with 409 `X-Reason: TENANT_HAS_DEPENDENTS`
 * while any of these is above zero, and sends the counts as the body. Accounts already marked for
 * deletion and soft-deleted agencies are not counted: the nightly jobs remove them.
 */
export interface TenantDeletionBlockers {
    agencies: number;
    consultants: number;
    adviceSeekers: number;
    agencyAdmins: number;
    tenantAdmins: number;
    openInvites: number;
}

/** The order an admin removes them in: units first, then the accounts in them, then invitations. */
const BLOCKER_KINDS: readonly (keyof TenantDeletionBlockers)[] = [
    'agencies',
    'consultants',
    'adviceSeekers',
    'agencyAdmins',
    'tenantAdmins',
    'openInvites',
];

/**
 * Why TenantService refused to delete a Träger: `blocked` while agencies, accounts or open
 * invitations are left (409; `blockers` is null when the 409 had no counts), `unavailable` when it
 * could not ask UserService what is left (503) and therefore deleted nothing.
 */
export class TenantDeletionError extends Error {
    constructor(readonly reason: 'blocked' | 'unavailable', readonly blockers: TenantDeletionBlockers | null = null) {
        super(reason === 'blocked' ? FETCH_ERRORS.CONFLICT : FETCH_ERRORS.SERVICE_UNAVAILABLE);
        Object.setPrototypeOf(this, TenantDeletionError.prototype);
    }
}

const countOf = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

export const readTenantDeletionBlockers = async (response: Response): Promise<TenantDeletionBlockers | null> => {
    let body: unknown;
    try {
        body = await response.json();
    } catch {
        return null;
    }
    if (!body || typeof body !== 'object') return null;
    const record = body as Record<string, unknown>;
    return Object.fromEntries(
        BLOCKER_KINDS.map((kind) => [kind, countOf(record[kind])]),
    ) as unknown as TenantDeletionBlockers;
};

/** Maps what `fetchData` rejects with for a Träger deletion to an error the list can explain. */
export const toTenantDeletionError = async (failure: unknown): Promise<unknown> => {
    if (failure instanceof Response) {
        if (failure.status === 409)
            return new TenantDeletionError('blocked', await readTenantDeletionBlockers(failure));
        return new Error(`API call error: ${failure.status}`);
    }
    if (failure instanceof Error && failure.message === FETCH_ERRORS.SERVICE_UNAVAILABLE) {
        return new TenantDeletionError('unavailable');
    }
    return failure;
};

type Translate = (key: string, options: { count: number }) => string;

/** One line per kind that is still left, e.g. "2 Beratungsstellen (Beratungsstellen)". */
export const tenantDeletionBlockerLines = (blockers: TenantDeletionBlockers, t: Translate): string[] =>
    BLOCKER_KINDS.filter((kind) => blockers[kind] > 0).map((kind) =>
        t(`tenants.list.deleteMessage.blockers.${kind}`, { count: blockers[kind] }),
    );
