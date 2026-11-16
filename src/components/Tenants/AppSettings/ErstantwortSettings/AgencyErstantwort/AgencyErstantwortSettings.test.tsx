import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const { useAgencyErstantwort, save, translate, useErstantwortDefaults } = vi.hoisted(() => ({
    useAgencyErstantwort: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
    useErstantwortDefaults: vi.fn(() => ({ data: undefined })),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));
vi.mock('../../../../../hooks/useAgencyErstantwort.hook', () => ({
    useAgencyErstantwort: (id: string) => useAgencyErstantwort(id),
    useSaveAgencyErstantwort: () => ({ mutateAsync: save, isPending: false }),
}));
vi.mock('../../../../../hooks/useErstantwortDefaults.hook', () => ({
    useErstantwortDefaults: (informal: boolean) => useErstantwortDefaults(informal),
}));
vi.mock('../../../../../hooks/useTranslateLegalContent.hook', () => ({
    useTranslateLegalContent: () => ({ translate, isTranslating: false }),
}));
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({ title, value, onChange, readOnly }: any) => (
        <div>
            <label htmlFor={`ed-${title}`}>{title}</label>
            <textarea
                id={`ed-${title}`}
                value={value ?? ''}
                disabled={readOnly}
                onChange={(e) => onChange?.(e.target.value)}
            />
        </div>
    ),
}));

// eslint-disable-next-line import/first
import { AgencyErstantwortSettings } from './index';

const publishButton = () => screen.getByRole('button', { name: 'tenants.erstantwort.publish' });
const sectionToggle = (labelKey: string) => screen.getByRole('button', { name: labelKey });

beforeEach(() => {
    useAgencyErstantwort.mockReset().mockReturnValue({
        data: { erstantwortGreeting: { de: '<p>Hallo aus der Beratungsstelle</p>' } },
        isLoading: false,
        isError: false,
    });
    save.mockReset().mockResolvedValue({});
    translate.mockReset();
});

afterEach(cleanup);

describe('AgencyErstantwortSettings', () => {
    it("shows the centre's own greeting and only the four Bausteine a centre may write", () => {
        render(<AgencyErstantwortSettings agencyId="5" activeLanguages={['de']} />);

        expect(screen.getByLabelText('tenants.erstantwort.greeting.label')).toHaveValue(
            '<p>Hallo aus der Beratungsstelle</p>',
        );
        expect(sectionToggle('tenants.erstantwort.whoReadsAlong.label')).toBeInTheDocument();
        expect(sectionToggle('tenants.erstantwort.freeNotice.label')).toBeInTheDocument();
        expect(sectionToggle('tenants.erstantwort.closing.label')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'tenants.erstantwort.emergencyAddition.label' })).toBeNull();
        expect(screen.queryByText('tenants.erstantwort.deadline.label')).toBeNull();
        expect(screen.getByText('agency.erstantwort.intro')).toBeInTheDocument();
    });

    it('publishes without asking for "who reads along": the Träger statement applies while it is empty', async () => {
        render(<AgencyErstantwortSettings agencyId="5" activeLanguages={['de']} />);

        fireEvent.change(screen.getByLabelText('tenants.erstantwort.greeting.label'), {
            target: { value: '<p>Neu</p>' },
        });
        fireEvent.click(publishButton());

        await waitFor(() => expect(save).toHaveBeenCalled());
        expect(save.mock.calls[0][0]).toEqual({ erstantwortGreeting: { de: '<p>Neu</p>' } });
    });

    it("writes the Träger's informal German variant when the Träger is informal", () => {
        useAgencyErstantwort.mockReturnValue({
            data: { erstantwortGreeting: { 'de@informal': '<p>Hallo Du</p>' } },
            isLoading: false,
            isError: false,
        });
        render(<AgencyErstantwortSettings agencyId="5" languageFormal={false} activeLanguages={['de']} />);

        expect(screen.getByLabelText('tenants.erstantwort.greeting.label')).toHaveValue('<p>Hallo Du</p>');
    });

    it('translates a changed text into the active languages before publishing', async () => {
        translate.mockResolvedValue({ translations: { en: { erstantwortGreeting: '<p>New</p>' } } });
        render(<AgencyErstantwortSettings agencyId="5" activeLanguages={['de', 'en']} />);

        fireEvent.change(screen.getByLabelText('tenants.erstantwort.greeting.label'), {
            target: { value: '<p>Neu</p>' },
        });
        fireEvent.click(publishButton());
        fireEvent.click(await screen.findByRole('button', { name: 'legal.translation.modal.confirm' }));

        await waitFor(() => expect(save).toHaveBeenCalled());
        expect(translate).toHaveBeenCalledWith({
            sourceLang: 'de',
            targetLangs: ['en'],
            texts: { erstantwortGreeting: '<p>Neu</p>' },
        });
        expect(save.mock.calls[0][0].erstantwortGreeting.en).toBe('<p>New</p>');
    });

    it('is read-only without the right to edit', () => {
        render(<AgencyErstantwortSettings agencyId="5" activeLanguages={['de']} readOnly />);

        expect(screen.getByLabelText('tenants.erstantwort.greeting.label')).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'tenants.erstantwort.publish' })).toBeNull();
    });
});
