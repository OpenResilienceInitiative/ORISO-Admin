import { describe, expect, it } from 'vitest';
import {
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
    it('accepts a counsellor the backend already knows about', () => {
        expect(mayBeVisibleInRegistration({ hasAssignedConsultants: true, hasSelectedConsultants: false })).toBe(true);
    });

    it('accepts a counsellor picked in the form, because saving assigns them', () => {
        // The reported defect: on a saved agency the switch only looked at the server count,
        // so picking a counsellor — exactly what the hint on the card asks for — left it dead.
        expect(mayBeVisibleInRegistration({ hasAssignedConsultants: false, hasSelectedConsultants: true })).toBe(true);
    });

    it('does not refuse while the lookup has not answered', () => {
        // A failed or pending HAS_CONSULTANTS request leaves the flag undefined. Reading that
        // as "no counsellors" would block every save on this card for a staffed agency.
        expect(mayBeVisibleInRegistration({ hasAssignedConsultants: undefined, hasSelectedConsultants: false })).toBe(
            true,
        );
    });

    it('refuses when there is no counsellor at all', () => {
        expect(mayBeVisibleInRegistration({ hasAssignedConsultants: false, hasSelectedConsultants: false })).toBe(
            false,
        );
    });
});
