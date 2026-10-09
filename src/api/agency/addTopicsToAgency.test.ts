import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addTopicsToAgency, ADD_TOPICS_ERRORS } from './addTopicsToAgency';
import { FETCH_ERRORS, fetchData } from '../fetchData';
import getAgencyDataById, { AgencyAccessError } from './getAgencyById';

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: vi.fn() };
});
vi.mock('./getAgencyById', async () => {
    const actual = await vi.importActual<typeof import('./getAgencyById')>('./getAgencyById');
    return { ...actual, default: vi.fn() };
});

/** What the agency GET returns: far more than a topic change may write back. */
const STORED = {
    id: 3,
    name: 'Ost',
    external: true,
    url: 'https://ost.example.org',
    description: 'Beratung in Berlin',
    postcode: '10115',
    city: 'Berlin',
    street: 'Hauptstraße',
    houseNumber: '1',
    floorBuilding: '2. OG',
    country: 'DE',
    phone: '030 1',
    phoneSecondary: '030 2',
    email: 'ost@example.org',
    agencyLogo: 'logo.png',
    topics: [{ id: 13, name: 'Familie' }],
    offline: false,
    teamAgency: true,
    consultingType: 1,
    openingHours: 'Mo 9-12',
    counsellingRelations: ['PARENTAL_COUNSELLING'],
    dataProtection: { dataProtectionResponsibleEntity: 'AGENCY_RESPONSIBLE' },
    content: { impressum: { de: 'Impressum' } },
    settings: { consentText: 'x' },
    demographics: { ageFrom: 0, ageTo: 99, genders: [] },
};

const sentBody = () => JSON.parse(vi.mocked(fetchData).mock.calls[0][0].bodyData as string);

describe('addTopicsToAgency', () => {
    beforeEach(() => {
        vi.mocked(fetchData).mockReset();
        vi.mocked(fetchData).mockResolvedValue({});
        vi.mocked(getAgencyDataById).mockResolvedValue({ _embedded: STORED });
    });

    it('adds the topics and writes back only what the server would otherwise clear', async () => {
        await addTopicsToAgency('3', ['12']);

        expect(vi.mocked(fetchData).mock.calls[0][0]).toMatchObject({ method: 'PUT' });
        expect(vi.mocked(fetchData).mock.calls[0][0].url).toMatch(/\/agencies\/3$/);
        expect(sentBody()).toEqual({
            name: 'Ost',
            // The stored value, not a hard-coded false.
            external: true,
            url: 'https://ost.example.org',
            description: 'Beratung in Berlin',
            postcode: '10115',
            city: 'Berlin',
            street: 'Hauptstraße',
            houseNumber: '1',
            floorBuilding: '2. OG',
            country: 'DE',
            phone: '030 1',
            phoneSecondary: '030 2',
            email: 'ost@example.org',
            agencyLogo: 'logo.png',
            topicIds: [13, 12],
        });
    });

    it('explains a missing right instead of sending the admin to the access-denied page', async () => {
        vi.mocked(fetchData).mockRejectedValue(new Error(FETCH_ERRORS.FORBIDDEN));

        await expect(addTopicsToAgency('3', ['12'])).rejects.toThrow(ADD_TOPICS_ERRORS.FORBIDDEN);
        expect(vi.mocked(fetchData).mock.calls[0][0].responseHandling).toContain(FETCH_ERRORS.FORBIDDEN);
    });

    it('treats a centre the admin may not even read as a missing right', async () => {
        vi.mocked(getAgencyDataById).mockRejectedValue(new AgencyAccessError());

        await expect(addTopicsToAgency('3', ['12'])).rejects.toThrow(ADD_TOPICS_ERRORS.FORBIDDEN);
        expect(fetchData).not.toHaveBeenCalled();
    });

    it('names the one-topic-per-centre rule when the server refuses a second topic', async () => {
        vi.mocked(fetchData).mockRejectedValue(
            new Response(null, { status: 409, headers: { 'X-Reason': 'ONE_TOPIC_PER_AGENCY' } }),
        );

        await expect(addTopicsToAgency('3', ['12'])).rejects.toThrow(ADD_TOPICS_ERRORS.ONE_TOPIC_PER_AGENCY);
    });

    it('asks to try again when the server cannot read the one-topic switch', async () => {
        vi.mocked(fetchData).mockRejectedValue(
            new Response(null, { status: 503, headers: { 'X-Reason': 'SETTINGS_UNAVAILABLE' } }),
        );

        await expect(addTopicsToAgency('3', ['12'])).rejects.toThrow(ADD_TOPICS_ERRORS.SETTINGS_UNAVAILABLE);
    });

    it('fails plainly on anything else', async () => {
        vi.mocked(fetchData).mockRejectedValue(new Response(null, { status: 500 }));

        await expect(addTopicsToAgency('3', ['12'])).rejects.toThrow(ADD_TOPICS_ERRORS.FAILED);
    });
});
