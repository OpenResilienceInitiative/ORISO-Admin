import { describe, expect, it } from 'vite-plus/test';
import {
    assignableConsultants,
    consultantCreationBlockedReason,
    isConsultantSectionVisible,
    mayBeVisibleInRegistration,
} from './consultantSection';

const base = { hasPersistedAgency: true, hasTenant: true };

describe('isConsultantSectionVisible', () => {
    it('shows the section on a saved agency even when the card is not in edit mode', () => {
        // This is the reported complaint: the agency exists, has counsellors, and the
        // screen says nothing about them until you happen to click edit.
        expect(isConsultantSectionVisible({ ...base, asFields: true, editing: false })).toBe(true);
    });

    it('keeps showing it while the card is being edited', () => {
        expect(isConsultantSectionVisible({ ...base, asFields: true, editing: true })).toBe(true);
    });

    it('shows it on the create form, where the agency does not exist yet', () => {
        // Hiding it here would leave the admin with no way to learn that counsellors
        // are assigned on this screen at all.
        expect(isConsultantSectionVisible({ ...base, hasPersistedAgency: false })).toBe(true);
    });
});

describe('consultantCreationBlockedReason', () => {
    it('names the unsaved agency first, because that is the blocker to act on', () => {
        expect(consultantCreationBlockedReason({ hasPersistedAgency: false, hasTenant: false })).toBe(
            'agency.form.registrationSettings.createConsultant.saveAgencyFirst',
        );
    });

    it('names the missing tenant once the agency is saved', () => {
        expect(consultantCreationBlockedReason({ hasPersistedAgency: true, hasTenant: false })).toBe(
            'agency.form.registrationSettings.createConsultant.tenantFirst',
        );
    });

    it('returns null when nothing blocks creation', () => {
        expect(consultantCreationBlockedReason(base)).toBeNull();
    });
});

describe('mayBeVisibleInRegistration', () => {
    const activating = { isAlreadyVisible: false };

    it('accepts a counsellor the backend already knows about', () => {
        expect(
            mayBeVisibleInRegistration({ ...activating, hasAssignedConsultants: true, hasSelectedConsultants: false }),
        ).toBe(true);
    });

    it('accepts a counsellor picked in the form, because saving assigns them', () => {
        // The reported defect: on a saved agency the switch only looked at the server count,
        // so picking a counsellor — exactly what the hint on the card asks for — left it dead.
        expect(
            mayBeVisibleInRegistration({ ...activating, hasAssignedConsultants: false, hasSelectedConsultants: true }),
        ).toBe(true);
    });

    it('refuses to activate while the lookup has not answered', () => {
        // Undefined is a failed or pending HAS_CONSULTANTS request. Unknown state must not
        // authorise making an agency visible with nobody to answer.
        expect(
            mayBeVisibleInRegistration({
                ...activating,
                hasAssignedConsultants: undefined,
                hasSelectedConsultants: false,
            }),
        ).toBe(false);
    });

    it('leaves an already visible agency alone when the lookup has not answered', () => {
        // A postcode edit on a live agency must not be rejected because a request failed.
        expect(
            mayBeVisibleInRegistration({
                hasAssignedConsultants: undefined,
                hasSelectedConsultants: false,
                isAlreadyVisible: true,
            }),
        ).toBe(true);
    });

    it('refuses when there is no counsellor at all', () => {
        expect(
            mayBeVisibleInRegistration({ ...activating, hasAssignedConsultants: false, hasSelectedConsultants: false }),
        ).toBe(false);
    });
});

describe('assignableConsultants', () => {
    const own = { id: 1, tenantId: '7' };
    const ownToo = { id: 2, tenantId: 7 };
    const foreign = { id: 3, tenantId: '99' };
    const deleted = { id: 4, tenantId: '7', deleteDate: '2026-01-01T00:00:00Z' };
    const all = [own, ownToo, foreign, deleted];
    const input = { consultants: all, assignedIds: new Set<string>(), requiresTenant: true };

    it('offers only counsellors of the Träger the centre belongs to', () => {
        // The reported bug: a platform admin saw, and could pick, counsellors of other Träger.
        expect(assignableConsultants({ ...input, tenantId: 7 }).map(({ id }) => id)).toEqual([1, 2]);
    });

    it('offers nobody while a platform admin has not chosen the Träger yet', () => {
        expect(assignableConsultants({ ...input, tenantId: undefined })).toEqual([]);
    });

    it('keeps every counsellor on a single-tenant deployment, where no Träger can be chosen', () => {
        expect(
            assignableConsultants({ ...input, tenantId: undefined, requiresTenant: false }).map(({ id }) => id),
        ).toEqual([1, 2, 3]);
    });

    it('does not offer someone again who is already assigned', () => {
        expect(assignableConsultants({ ...input, tenantId: 7, assignedIds: new Set(['1']) })).toEqual([ownToo]);
    });

    it('does not offer a counsellor whose tenant is unknown for a known Träger', () => {
        expect(assignableConsultants({ ...input, consultants: [{ id: 5 }], tenantId: 7 })).toEqual([]);
    });
});
