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

    it('sends the standing supervisor, and an empty string when the admin cleared it', async () => {
        await editCounselorData('consultant-1', {
            ...baseFormData,
            assignedSupervisorId: 'supervisor-7',
        });
        expect(JSON.parse(vi.mocked(fetchData).mock.calls[0][0].bodyData as string).assignedSupervisorId).toBe(
            'supervisor-7',
        );

        vi.mocked(fetchData).mockClear();

        await editCounselorData('consultant-1', { ...baseFormData, assignedSupervisorId: '' });
        // '' is the backend's "clear it" signal — it must survive, not be dropped as falsy.
        expect(JSON.parse(vi.mocked(fetchData).mock.calls[0][0].bodyData as string).assignedSupervisorId).toBe('');
    });

    it('omits the standing supervisor when the form did not render the field', async () => {
        await editCounselorData('consultant-1', { ...baseFormData });

        expect(JSON.parse(vi.mocked(fetchData).mock.calls[0][0].bodyData as string)).not.toHaveProperty(
            'assignedSupervisorId',
        );
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
    /**
     * #1015. The page form hides the absence toggle but shows the stored note, and antd hands
     * `onFinish` only the fields it REGISTERED — so `absent` used to arrive here as `undefined`
     * and `!!undefined` wrote `false` over a counsellor who was away, dropping the note with it.
     * The flag is required by the update endpoint (`@NotNull`, and the column is a primitive
     * boolean), so it cannot simply be omitted: the shared field set carries it hidden instead,
     * and this is the payload that has to come out of it.
     */
    it('keeps an absent counsellor absent and sends the note along with the flag', async () => {
        await editCounselorData('consultant-1', {
            ...baseFormData,
            absent: true,
            absenceMessage: 'Bin bis zum 30.09. nicht erreichbar.',
        });

        const body = JSON.parse(vi.mocked(fetchData).mock.calls[0][0].bodyData as string);
        expect(body.absent).toBe(true);
        expect(body.absenceMessage).toBe('Bin bis zum 30.09. nicht erreichbar.');
    });

    /**
     * The same "a field the form did not submit is not false" rule as
     * `src/hooks/topicRequestBody.ts`. Here it can be honoured by omission: the flag is optional
     * on the endpoint and the service acts on it only when it is non-null, so an omitted flag
     * leaves the group-chat role alone — while `false` REMOVES it from Keycloak.
     */
    it('omits the group-chat flag when the form did not render its switch', async () => {
        await editCounselorData('consultant-1', { ...baseFormData });

        expect(JSON.parse(vi.mocked(fetchData).mock.calls[0][0].bodyData as string)).not.toHaveProperty(
            'isGroupchatConsultant',
        );
    });

    it('still sends the group-chat flag, true or false, when the switch was rendered', async () => {
        await editCounselorData('consultant-1', { ...baseFormData, isGroupchatConsultant: true });
        expect(JSON.parse(vi.mocked(fetchData).mock.calls[0][0].bodyData as string).isGroupchatConsultant).toBe(true);

        vi.mocked(fetchData).mockClear();

        // Explicitly false is a real instruction — it withdraws the role — and must survive.
        await editCounselorData('consultant-1', { ...baseFormData, isGroupchatConsultant: false });
        expect(JSON.parse(vi.mocked(fetchData).mock.calls[0][0].bodyData as string).isGroupchatConsultant).toBe(false);
    });
    /**
     * The absence note does NOT follow the null/omitted-leaves-untouched contract the fields
     * above use, and that difference is the whole point of this pair of tests.
     * `ConsultantUpdateService` writes `consultant.setAbsenceMessage(dto.getAbsenceMessage())`
     * unconditionally, so an OMITTED note is how the note is cleared — and a blank one is
     * refused outright for an absent counsellor
     * (`UserAccountInputValidator#validateAbsence` → 400 MISSING_ABSENCE_MESSAGE_FOR_ABSENT_USER,
     * with `@Size(min = 1)` on the DTO behind it). So `''` must never be sent, and "send it only
     * when there is one" is the shape that fits, not `!== undefined`.
     */
    it('drops the note when the absence ended, which is how the backend clears it', async () => {
        await editCounselorData('consultant-1', {
            ...baseFormData,
            absent: false,
            absenceMessage: 'Bin bis zum 30.09. nicht erreichbar.',
        } as unknown as CounselorData);

        const body = vi.mocked(fetchData).mock.calls[0][0].bodyData as string;
        // Asserted on the SERIALISED body: an object assertion passes while JSON.stringify
        // drops an undefined key, which is exactly the blind spot that let this class of bug
        // through before.
        expect(JSON.parse(body)).not.toHaveProperty('absenceMessage');
        expect(body).not.toContain('absenceMessage');
        expect(JSON.parse(body).absent).toBe(false);
    });

    it('never sends a blank note, which the endpoint refuses for an absent counsellor', async () => {
        await editCounselorData('consultant-1', {
            ...baseFormData,
            absent: true,
            absenceMessage: '',
        } as unknown as CounselorData);

        const body = vi.mocked(fetchData).mock.calls[0][0].bodyData as string;
        expect(body).not.toContain('absenceMessage');
    });
});
