import getCounselorById from '../counselor/getCounselorById';
import { putAgenciesForCounselor } from './putAgenciesForCounselor';

/**
 * Detaches one counsellor from one agency. Uses the same PUT as the assignment because
 * DELETE /useradmin/consultants/{id}/agencies/{agencyId} is open to user-admins only;
 * agency admins pass the PUT's own agency check (#1069).
 */
export const unassignAgencyFromConsultant = async (agencyId: string | number, consultantId: string) => {
    const target = String(agencyId);
    const consultant = await getCounselorById(consultantId);
    const current = new Set([
        ...(consultant.agencyIds || []).map(String),
        ...(consultant.agencies || []).map((agency) => (agency?.id != null ? String(agency.id) : '')).filter(Boolean),
    ]);

    if (!current.delete(target)) {
        return;
    }

    // The PUT replaces the whole set, so every other agency is sent back unchanged.
    await putAgenciesForCounselor(consultantId, Array.from(current), { rejectForbidden: true });
};
