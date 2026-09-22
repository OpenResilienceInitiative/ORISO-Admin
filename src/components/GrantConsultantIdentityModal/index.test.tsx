import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GrantConsultantIdentityModal } from './index';
import { topicOptionsForAgencies } from './topicOptionsForAgencies';

// Both call styles are in use: `const { t } = useTranslation()` and `const [t] = useTranslation()`.
vi.mock('react-i18next', () => {
    const t = (key: string) => key;
    const i18n = { language: 'de' };
    return { useTranslation: () => Object.assign([t, i18n], { t, i18n }) };
});

const mocks = vi.hoisted(() => ({
    grant: vi.fn(),
    agencies: [] as unknown[],
}));

vi.mock('../../api/admins/grantConsultantIdentityData', () => ({
    grantConsultantIdentityData: mocks.grant,
}));

vi.mock('../../hooks/useAgencysData', () => ({
    useAgenciesData: () => ({ data: { data: mocks.agencies }, isLoading: false }),
}));

const topic = (id: number, name: string) => ({ id, name, description: '', internalIdentifier: null, status: 'ACTIVE' });
const agency = (id: number, name: string, topics: ReturnType<typeof topic>[]) => ({
    id,
    name,
    city: 'Berlin',
    postcode: '10115',
    deleteDate: null,
    tenantId: 1,
    topics,
});

const openAndPickAgency = async (agencyName: string) => {
    const user = userEvent.setup();
    render(<GrantConsultantIdentityModal adminId="admin-1" tenantId={1} />);
    await user.click(screen.getByRole('button', { name: 'grantConsultantIdentity.button' }));
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(await screen.findByRole('option', { name: new RegExp(agencyName) }));
    return user;
};

describe('topicOptionsForAgencies', () => {
    it('offers the union of the selected agencies’ topics without duplicates', () => {
        const agencies = [
            agency(1, 'Nord', [topic(10, 'Sucht'), topic(11, 'Schulden')]),
            agency(2, 'Süd', [topic(11, 'Schulden'), topic(12, 'Familie')]),
            agency(3, 'West', [topic(13, 'Migration')]),
        ];

        expect(topicOptionsForAgencies(agencies as never, ['1', '2'])).toEqual([
            { value: '10', label: 'Sucht' },
            { value: '11', label: 'Schulden' },
            { value: '12', label: 'Familie' },
        ]);
        expect(topicOptionsForAgencies(agencies as never, [])).toEqual([]);
    });
});

describe('GrantConsultantIdentityModal', () => {
    beforeEach(() => {
        mocks.grant.mockReset().mockResolvedValue({});
    });

    it('assigns the only topic of the Beratungsstelle automatically and sends it', async () => {
        mocks.agencies = [agency(1, 'Beratungsstelle Nord', [topic(10, 'Sucht')])];
        const user = await openAndPickAgency('Beratungsstelle Nord');

        expect(await screen.findByText('grantConsultantIdentity.modal.singleTopicHint')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'grantConsultantIdentity.modal.confirm' }));

        await waitFor(() =>
            expect(mocks.grant).toHaveBeenCalledWith('admin-1', {
                formalLanguage: true,
                agencyIds: ['1'],
                topicIds: ['10'],
            }),
        );
    });

    it('requires a topic when the Beratungsstelle offers several', async () => {
        mocks.agencies = [agency(1, 'Beratungsstelle Nord', [topic(10, 'Sucht'), topic(11, 'Schulden')])];
        const user = await openAndPickAgency('Beratungsstelle Nord');

        await user.click(screen.getByRole('button', { name: 'grantConsultantIdentity.modal.confirm' }));
        expect(mocks.grant).not.toHaveBeenCalled();

        await user.click(screen.getAllByRole('combobox')[1]);
        await user.click(await screen.findByRole('option', { name: 'Schulden' }));
        await user.click(screen.getByRole('button', { name: 'grantConsultantIdentity.modal.confirm' }));

        await waitFor(() =>
            expect(mocks.grant).toHaveBeenCalledWith('admin-1', expect.objectContaining({ topicIds: ['11'] })),
        );
    });

    it('explains and blocks the grant when the Beratungsstelle has no topic', async () => {
        mocks.agencies = [agency(1, 'Beratungsstelle Nord', [])];
        await openAndPickAgency('Beratungsstelle Nord');

        expect(await screen.findByRole('alert')).toHaveTextContent('grantConsultantIdentity.modal.noTopics');
        expect(screen.getByRole('button', { name: 'grantConsultantIdentity.modal.confirm' })).toBeDisabled();
    });
});
