import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
    updateAgencyPostCodeRange: vi.fn(),
    assignAgencyToConsultants: vi.fn(),
}));

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: mocks.fetchData };
});
vi.mock('./updateAgencyType', () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./updateAgencyPostCodeRange', () => ({ default: mocks.updateAgencyPostCodeRange }));
vi.mock('../consultingtype/getConsultingType4Tenant', () => ({ default: vi.fn().mockResolvedValue('1') }));
vi.mock('./assignAgencyToConsultants', () => ({ assignAgencyToConsultants: mocks.assignAgencyToConsultants }));

import { updateAgencyData } from './updateAgencyData';
import { FETCH_ERRORS, FETCH_SUCCESS } from '../fetchData';

const agencyModel: any = { id: '55', consultingType: '1' };

const sentBody = () => JSON.parse(mocks.fetchData.mock.calls[0][0].bodyData);

describe('updateAgencyData — ADR-014 multi-topic departments', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
        mocks.fetchData.mockResolvedValue({ _embedded: {} });
        mocks.updateAgencyPostCodeRange.mockReset();
        mocks.updateAgencyPostCodeRange.mockResolvedValue(undefined);
        mocks.assignAgencyToConsultants.mockReset();
        mocks.assignAgencyToConsultants.mockResolvedValue(undefined);
    });

    it('sends every selected topic, not just the first', async () => {
        // ADR-014: one Beratungsstelle carries several Fachbereiche. Dropping any of them here
        // deletes the corresponding agency_topic row — together with that department's published
        // Impressum and Datenschutzerklärung (orphanRemoval on Agency.agencyTopics).
        await updateAgencyData(agencyModel, {
            ...agencyModel,
            topicIds: [{ value: '3' }, { value: '9' }, { value: '12' }],
        } as any);
        expect(sentBody().topicIds).toEqual(['3', '9', '12']);
    });

    it('leaves visibility alone when the patch carries no online field', async () => {
        // ORISO-Admin#715: publishing a department's legal document sends a narrow
        // card patch with no `online` field. `offline: !formInput.online` read that
        // absence as false and took the agency out of registration — an agency admin
        // publishing their imprint made their own counselling centre disappear.
        // Delete rather than simply omit: spreading the fixture would silently stop
        // exercising the undefined branch the day `online` is added to it, and the
        // test would keep passing while proving nothing.
        const patch: Record<string, unknown> = { ...agencyModel };
        delete patch.online;

        await updateAgencyData(agencyModel, patch as any);
        expect(sentBody()).not.toHaveProperty('offline');
    });

    it('still hides an agency that is explicitly switched offline', async () => {
        await updateAgencyData(agencyModel, { ...agencyModel, online: false } as any);
        expect(sentBody().offline).toBe(true);
    });

    it('still publishes an agency that is explicitly switched online', async () => {
        await updateAgencyData(agencyModel, { ...agencyModel, online: true } as any);
        expect(sentBody().offline).toBe(false);
    });

    it('still accepts a lone Option from the former single-select shape', async () => {
        await updateAgencyData(agencyModel, {
            ...agencyModel,
            topicIds: { value: '7', label: 'Debt counselling' },
        } as any);
        expect(sentBody().topicIds).toEqual(['7']);
    });

    it('sends an empty topicIds array when the picker was explicitly cleared', async () => {
        // Explicit clearing must stay possible and distinguishable from "field absent" below.
        await updateAgencyData(agencyModel, { ...agencyModel, topicIds: [] } as any);
        expect(sentBody().topicIds).toEqual([]);
    });

    it('omits topicIds entirely when the form carries no topic field', async () => {
        // The picker only renders when the topic list loaded (`topics?.length > 0 &&` in
        // AgencySettings). If that request failed, the field is absent — and sending [] would tell
        // the backend to clear every department. Omitting the key makes the backend's
        // AgencyTopicMergeService keep the existing links (null = keep, [] = clear).
        const withoutTopics: any = { id: '55', consultingType: '1', name: 'Caritas Neukölln' };
        await updateAgencyData(agencyModel, withoutTopics);
        expect(sentBody()).not.toHaveProperty('topicIds');
    });
});

describe('updateAgencyData — validation errors', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
        mocks.fetchData.mockResolvedValue({ _embedded: {} });
    });

    it('returns the 400 response to the form so it can render field errors', async () => {
        await updateAgencyData(agencyModel, { ...agencyModel } as any);

        expect(mocks.fetchData.mock.calls[0][0].responseHandling).toEqual([
            FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
            FETCH_ERRORS.CATCH_ALL,
            FETCH_SUCCESS.CONTENT,
        ]);
    });
});

describe('updateAgencyData — postcode range preservation', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
        mocks.fetchData.mockResolvedValue({ _embedded: {} });
        mocks.updateAgencyPostCodeRange.mockReset();
        mocks.updateAgencyPostCodeRange.mockResolvedValue(undefined);
    });

    it('does not replace stored postcode ranges when a narrow card patch has no postcode data', async () => {
        await updateAgencyData(agencyModel, { ...agencyModel, online: true } as any);

        expect(mocks.updateAgencyPostCodeRange).not.toHaveBeenCalled();
    });

    it('updates postcode ranges when the registration card explicitly submits them', async () => {
        const postCodes = [{ from: '10115', until: '10179' }];
        await updateAgencyData(agencyModel, { ...agencyModel, online: true, postCodes } as any);

        expect(mocks.updateAgencyPostCodeRange).toHaveBeenCalledWith('55', postCodes, '');
    });
});

describe('updateAgencyData — agency settings (feature toggles)', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
        mocks.fetchData.mockResolvedValue({ _embedded: {} });
    });

    it('includes settings in the PUT body when present', async () => {
        await updateAgencyData(agencyModel, {
            ...agencyModel,
            settings: { featureVideoCallsEnabled: false, featureAnonymousChatEnabled: true },
        } as any);
        expect(sentBody().settings).toEqual({
            featureVideoCallsEnabled: false,
            featureAnonymousChatEnabled: true,
        });
    });

    it('strips the injected agencyAdminControls before sending', async () => {
        // The GET response carries the platform-wide agencyAdminControls injected into each
        // agency's settings. Sending them back would make the backend treat the save as a
        // platform-controls update, which only the super admin may perform (403 for everyone else).
        await updateAgencyData(agencyModel, {
            ...agencyModel,
            settings: {
                featureVideoCallsEnabled: true,
                agencyAdminControls: {
                    permissionsPageEnabled: true,
                    allowedPermissionToggles: { videoCalls: false },
                },
            },
        } as any);
        expect(sentBody().settings).toEqual({ featureVideoCallsEnabled: true });
        expect(sentBody().settings.agencyAdminControls).toBeUndefined();
    });

    it('omits settings from the PUT body when absent, so the backend keeps the stored value', async () => {
        await updateAgencyData(agencyModel, { ...agencyModel } as any);
        expect('settings' in sentBody()).toBe(false);
    });
});

describe('updateAgencyData — counsellor assignment on the edit path', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
        mocks.fetchData.mockResolvedValue({ _embedded: { id: '55' } });
        mocks.updateAgencyPostCodeRange.mockReset();
        mocks.updateAgencyPostCodeRange.mockResolvedValue(undefined);
        mocks.assignAgencyToConsultants.mockReset();
        mocks.assignAgencyToConsultants.mockResolvedValue(undefined);
    });

    it('assigns the picked counsellors, so the selection is not silently dropped', async () => {
        // The reported defect: only addAgencyData assigned counsellors. Editing an existing
        // agency discarded the selection without a word, the backend kept reporting zero
        // counsellors, and the registration switch therefore stayed dead however often the
        // admin picked somebody and pressed save.
        await updateAgencyData(agencyModel, {
            ...agencyModel,
            consultantIds: [{ value: '7' }, { value: '9' }],
        } as any);

        expect(mocks.assignAgencyToConsultants).toHaveBeenCalledWith('55', [{ value: '7' }, { value: '9' }]);
    });

    it('leaves assignments alone when the patch carries no counsellor field', async () => {
        // Same absent-vs-empty rule the rest of this module follows: publishing a department's
        // legal document sends a narrow card patch with no consultantIds.
        await updateAgencyData(agencyModel, { ...agencyModel } as any);

        expect(mocks.assignAgencyToConsultants).not.toHaveBeenCalled();
    });

    it('keeps the saved agency and reports the failure when assigning does not work', async () => {
        // Losing the agency edit because one counsellor could not be attached would be worse
        // than the partial result. The caller shows a warning on this flag.
        mocks.assignAgencyToConsultants.mockRejectedValue(new Error('consultant service down'));

        const result = await updateAgencyData(agencyModel, {
            ...agencyModel,
            consultantIds: [{ value: '7' }],
        } as any);

        expect(result).toMatchObject({ id: '55', consultantAssignmentFailed: true });
    });

    it('assigns the counsellors before the PUT, so the first counsellor + "visible" saves in one go', async () => {
        // #1069: AgencyService's AgencyOfflineStatusValidator rejects offline=false while the
        // agency has no counsellor (AGENCY_CONTAINS_NO_CONSULTANTS). Assigning after the PUT
        // meant the very save that picks the first counsellor could never switch visibility on.
        const order: string[] = [];
        mocks.assignAgencyToConsultants.mockImplementation(async () => {
            order.push('assign');
        });
        mocks.fetchData.mockImplementation(async () => {
            order.push('put');
            return { _embedded: { id: '55' } };
        });

        await updateAgencyData(agencyModel, {
            ...agencyModel,
            online: true,
            consultantIds: [{ value: '7' }],
        } as any);

        expect(order).toEqual(['assign', 'put']);
        expect(sentBody().offline).toBe(false);
    });

    it('still saves the agency when the early assignment fails', async () => {
        mocks.assignAgencyToConsultants.mockRejectedValue(new Error('consultant service down'));

        const result = await updateAgencyData(agencyModel, {
            ...agencyModel,
            consultantIds: [{ value: '7' }],
        } as any);

        expect(mocks.fetchData).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({ id: '55', consultantAssignmentFailed: true });
    });
});
