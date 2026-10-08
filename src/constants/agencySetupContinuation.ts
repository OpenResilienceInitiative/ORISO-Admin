import routePathNames from '../appConfig';
import type { CounsellorOnboardingInviteDTO } from '../api/counsellorOnboarding/counsellorOnboarding';

/** An internal destination hint, never an authority or an arbitrary return URL. */
export const validAgencySetupId = (value: unknown): string | null => {
    const id = typeof value === 'number' ? String(value) : value;
    return typeof id === 'string' && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? id : null;
};

const agencySetupPath = (id: string): string => `${routePathNames.agency}/${id}/setup`;

export const agencySetupLoginPath = (value: unknown): string => {
    const id = validAgencySetupId(value);
    return id ? `${routePathNames.login}?agencySetupId=${id}` : routePathNames.login;
};

export const agencySetupFromSearch = (search: string): string | null => {
    const hints = new URLSearchParams(search).getAll('agencySetupId');
    const id = hints.length === 1 ? validAgencySetupId(hints[0]) : null;
    return id ? agencySetupPath(id) : null;
};

export const agencySetupLoginFromPath = (pathname: string): string => {
    const match = /^\/admin\/agency\/([1-9]\d*)\/setup$/.exec(pathname);
    return agencySetupLoginPath(match?.[1]);
};

/** Only a server-resolved founding invitation continues into the full centre setup. */
export const agencySetupLoginForInvite = (
    invite:
        | Pick<
              CounsellorOnboardingInviteDTO,
              'onboardingPurpose' | 'targetRole' | 'agencyIdAllocationMode' | 'agencyId'
          >
        | null
        | undefined,
): string | null => {
    if (
        invite?.onboardingPurpose !== 'INVITE' ||
        invite.targetRole !== 'AGENCY_ADMIN' ||
        (invite.agencyIdAllocationMode !== 'AUTO' && invite.agencyIdAllocationMode !== 'MANUAL')
    ) {
        return null;
    }
    const id = validAgencySetupId(invite.agencyId);
    return id ? agencySetupLoginPath(id) : null;
};
