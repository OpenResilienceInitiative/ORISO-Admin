/* eslint-disable no-underscore-dangle -- HAL payload */
import { counselorEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { DEFAULT_ROLE } from './putAgenciesForCounselor';

type ConsultantSelection = string | number | { value?: string | number; id?: string | number };

const normalizeSelectionId = (selection: ConsultantSelection) => {
    if (typeof selection === 'string' || typeof selection === 'number') {
        return String(selection);
    }

    if (selection?.value !== undefined && selection.value !== null) {
        return String(selection.value);
    }

    if (selection?.id !== undefined && selection.id !== null) {
        return String(selection.id);
    }

    return '';
};

type ConsultantAgenciesResponse = {
    _embedded: { _embedded?: { id?: number | string } }[];
};

const addAgencyIfMissing = async (consultantId: string, agencyId: string) => {
    const url = `${counselorEndpoint}/${encodeURIComponent(consultantId)}/agencies`;
    const scopeErrors = [FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE, FETCH_ERRORS.CATCH_ALL_SILENT];
    const relations: ConsultantAgenciesResponse = await fetchData({
        url,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: scopeErrors,
    });

    // The profile's HAL projection does not contain the current relations.
    // Read the dedicated collection to skip already assigned counsellors.
    const { _embedded: agencies } = relations;
    if (!Array.isArray(agencies)) throw new Error('Could not read the counsellor’s centre assignments.');
    if (agencies.some(({ _embedded: agency }) => String(agency?.id) === agencyId)) return;

    // POST adds just this relation. It cannot replace or delete another centre.
    await fetchData({
        url,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE, ...scopeErrors],
        bodyData: JSON.stringify({ agencyId, roleSetKey: DEFAULT_ROLE }),
    });
};

export const assignAgencyToConsultants = async (
    agencyId: string | number,
    consultantSelections: ConsultantSelection[] = [],
) => {
    const finalAgencyId = String(agencyId);
    const consultantIds = Array.from(new Set(consultantSelections.map(normalizeSelectionId).filter(Boolean)));

    if (!finalAgencyId || consultantIds.length === 0) {
        return;
    }

    const results = await Promise.allSettled(
        consultantIds.map((consultantId) => addAgencyIfMissing(consultantId, finalAgencyId)),
    );
    const failure = results.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
};
