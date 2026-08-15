import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchData } from '../fetchData';
import { editCounselorData } from './editCounselorData';
import { CounselorData } from '../../types/counselor';

vi.mock('../fetchData', () => ({
    FETCH_ERRORS: {
        CATCH_ALL: 'CATCH_ALL',
    },
    FETCH_METHODS: { PUT: 'PUT' },
    fetchData: vi.fn(),
}));

vi.mock('../agency/putAgenciesForCounselor', () => ({
    putAgenciesForCounselor: vi.fn(),
}));

const baseFormData = {
    firstname: 'Ada',
    lastname: 'Lovelace',
    email: 'ada@example.org',
    formalLanguage: true,
    absent: false,
} as unknown as CounselorData;

describe('editCounselorData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fetchData).mockResolvedValue({
            status: 200,
            json: vi.fn().mockResolvedValue({ _embedded: { id: 'consultant-1' } }),
        } as unknown as Response);
    });

    it('sends the personal-info fields including empty strings so the backend can clear them', async () => {
        await editCounselorData('consultant-1', {
            ...baseFormData,
            salutation: 'counsellor_male',
            position: '',
            title: 'M.A.',
            adminRemarks: '',
        });

        const request = vi.mocked(fetchData).mock.calls[0][0];
        expect(JSON.parse(request.bodyData as string)).toMatchObject({
            salutation: 'counsellor_male',
            position: '',
            title: 'M.A.',
            adminRemarks: '',
        });
    });

    it('omits personal-info fields the form did not render', async () => {
        await editCounselorData('consultant-1', { ...baseFormData });

        const body = JSON.parse(vi.mocked(fetchData).mock.calls[0][0].bodyData as string);
        expect(body).not.toHaveProperty('salutation');
        expect(body).not.toHaveProperty('position');
        expect(body).not.toHaveProperty('title');
        expect(body).not.toHaveProperty('adminRemarks');
    });

    it('sends both display names, keeping an empty internal name so the backend clears it (fallback)', async () => {
        await editCounselorData('consultant-1', {
            ...baseFormData,
            displayName: 'Anna B.',
            internalDisplayName: '',
        });

        const body = JSON.parse(vi.mocked(fetchData).mock.calls[0][0].bodyData as string);
        expect(body).toMatchObject({
            displayName: 'Anna B.',
            internalDisplayName: '',
        });
    });

    it('omits the display names when the form did not render them', async () => {
        await editCounselorData('consultant-1', { ...baseFormData });

        const body = JSON.parse(vi.mocked(fetchData).mock.calls[0][0].bodyData as string);
        expect(body).not.toHaveProperty('displayName');
        expect(body).not.toHaveProperty('internalDisplayName');
    });
});
