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
});
