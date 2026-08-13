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

describe('updateAgencyData — ADR-014 multi-topic departments', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
        mocks.fetchData.mockResolvedValue({ _embedded: {} });
        mocks.updateAgencyPostCodeRange.mockReset();
        mocks.updateAgencyPostCodeRange.mockResolvedValue(undefined);
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
