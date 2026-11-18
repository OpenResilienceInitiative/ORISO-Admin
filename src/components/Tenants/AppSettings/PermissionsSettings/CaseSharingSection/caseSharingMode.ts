import { normalizeTeamAgency } from '../../../../../api/agency/updateAgencyType';

/**
 * ORISO-Admin#1558: how counsellors of a Beratungsstelle share a Mailberatung case. One choice,
 * never two at once.
 *
 * - `caseHandover` (Fallübergabe): one counsellor owns the case; it is handed over or briefly
 *   shared for absence or advice. Master `caseHandoverEnabled` (TenantService, per Träger).
 * - `teamCounselling` (Teamberatung): every counsellor of the centre sees every case (`teamAgency`,
 *   AgencyService, per Beratungsstelle).
 * - `none`: the case stays with the counsellor who accepted it.
 */
export type CaseSharingMode = 'caseHandover' | 'teamCounselling' | 'none';

type StoredCaseSharing = {
    /** AgencyService `teamAgency`; the agency list hands it over as `'true'` / `'false'`. */
    teamAgency: unknown;
    /** Resolved `caseHandoverEnabled` of the centre's Träger. */
    caseHandoverEnabled: boolean | undefined;
};

const isKnown = ({ teamAgency, caseHandoverEnabled }: StoredCaseSharing) =>
    teamAgency !== undefined && teamAgency !== null && typeof caseHandoverEnabled === 'boolean';

/** True when today's data has team counselling and case handover on at once. */
export const hasBothCaseSharingModes = (stored: StoredCaseSharing) =>
    isKnown(stored) && normalizeTeamAgency(stored.teamAgency) && stored.caseHandoverEnabled === true;

/**
 * The one choice today's two values amount to; undefined while either is unknown. Both on reads as
 * team counselling: the proposed migration keeps what the centre's counsellors see today (pending
 * product decision, #1558).
 */
export const caseSharingModeOf = (stored: StoredCaseSharing): CaseSharingMode | undefined => {
    if (!isKnown(stored)) return undefined;
    if (normalizeTeamAgency(stored.teamAgency)) return 'teamCounselling';
    return stored.caseHandoverEnabled ? 'caseHandover' : 'none';
};
