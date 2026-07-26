import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn(), updateAgencyPostCodeRange: vi.fn() }));

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: mocks.fetchData };
});
vi.mock('./updateAgencyType', () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./updateAgencyPostCodeRange', () => ({ default: mocks.updateAgencyPostCodeRange }));
vi.mock('../consultingtype/getConsultingType4Tenant', () => ({ default: vi.fn().mockResolvedValue('1') }));

import { updateAgencyData } from './updateAgencyData';

const agencyModel: any = { id: '55', consultingType: '1' };

const sentBody = () => JSON.parse(mocks.fetchData.mock.calls[0][0].bodyData);

describe('updateAgencyData — ADR-003 single-select topic', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
        mocks.fetchData.mockResolvedValue({ _embedded: {} });
        mocks.updateAgencyPostCodeRange.mockReset();
        mocks.updateAgencyPostCodeRange.mockResolvedValue(undefined);
    });

    it('sends the single-select Option as a one-element topicIds array', async () => {
        await updateAgencyData(agencyModel, {
            ...agencyModel,
            topicIds: { value: '7', label: 'Debt counselling' },
        } as any);
        expect(sentBody().topicIds).toEqual(['7']);
    });

    it('sends an empty topicIds array when the picker was cleared', async () => {
        // Regression guard: with the old `|| topics` fallback a cleared [] fell back to the
        // backend topics and could not be cleared. `?? topics` + normalize keeps it empty.
        await updateAgencyData(agencyModel, { ...agencyModel, topicIds: [] } as any);
        expect(sentBody().topicIds).toEqual([]);
    });

    it('still accepts the legacy Option[] shape', async () => {
        await updateAgencyData(agencyModel, {
            ...agencyModel,
            topicIds: [{ value: '3' }, { value: '9' }],
        } as any);
        expect(sentBody().topicIds).toEqual(['3', '9']);
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
