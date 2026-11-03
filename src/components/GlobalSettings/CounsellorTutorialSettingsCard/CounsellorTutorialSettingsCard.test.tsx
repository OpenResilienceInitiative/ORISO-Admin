import '@ant-design/v5-patch-for-react-19';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { CounsellorTutorialSettingsCard, CounsellorTutorialSettingsCardContainer } from '.';

const state = vi.hoisted(() => ({
    settings: {} as Record<string, unknown>,
    mutateSettings: vi.fn(),
    setManualSettings: vi.fn(),
    isSuperAdmin: true,
    mutation: { isPending: false, variables: undefined as unknown },
    messageError: vi.fn(),
}));
vi.mock('antd', async () => {
    const actual = await vi.importActual<typeof import('antd')>('antd');
    return { ...actual, message: { ...actual.message, error: state.messageError } };
});
vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => ({ isSuperAdmin: state.isSuperAdmin }) }));
vi.mock('../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: state.settings, setManualSettings: state.setManualSettings }),
}));
vi.mock('../../../hooks/useSettingsAdminMutation.hook', () => ({
    useSettingsAdminMutation: () => ({ mutate: state.mutateSettings, ...state.mutation }),
}));
const status = (label: string) => within(screen.getByText(label).closest('div')!).getByRole('definition');

beforeEach(async () => {
    state.settings = {};
    state.mutateSettings.mockClear();
    state.setManualSettings.mockClear();
    state.messageError.mockClear();
    state.isSuperAdmin = true;
    state.mutation = { isPending: false, variables: undefined };
    await i18n.changeLanguage('de');
});

describe('Counsellor tutorial settings preview', () => {
    it.each([
        [true, true, 'Verfügbar', 'Verfügbar'],
        [true, false, 'Verfügbar', 'Ausgeschaltet'],
        [false, true, 'Ausgeschaltet', 'Ausgeschaltet'],
        [false, false, 'Ausgeschaltet', 'Ausgeschaltet'],
    ])(
        'reports availability for master %s and practice %s',
        (toursEnabled, practiceEnabled, toursStatus, practiceStatus) => {
            render(<CounsellorTutorialSettingsCard toursEnabled={toursEnabled} practiceEnabled={practiceEnabled} />);
            expect(status('Rundgänge')).toHaveTextContent(toursStatus);
            expect(status('Übungsbereich')).toHaveTextContent(practiceStatus);
            expect(screen.getByRole('switch', { name: 'Rundgänge in Hilfe anzeigen' })).toHaveProperty(
                'checked',
                toursEnabled,
            );
            expect(screen.getByRole('switch', { name: 'Übungsbereich anbieten' })).toHaveProperty(
                'checked',
                practiceEnabled,
            );
        },
    );

    it('does not present missing settings as a reported server state', () => {
        render(<CounsellorTutorialSettingsCard />);
        expect(status('Rundgänge')).toHaveTextContent('Nicht gemeldet');
        expect(status('Übungsbereich')).toHaveTextContent('Nicht gemeldet');
        expect(screen.getAllByRole('switch').every((control) => !(control as HTMLInputElement).checked)).toBe(true);
    });

    it('updates the displayed server state after loading or a refresh', () => {
        const { rerender } = render(<CounsellorTutorialSettingsCard />);
        rerender(<CounsellorTutorialSettingsCard toursEnabled practiceEnabled />);
        expect(status('Rundgänge')).toHaveTextContent('Verfügbar');
        expect(screen.getByRole('switch', { name: 'Rundgänge in Hilfe anzeigen' })).toBeChecked();
        expect(screen.getByRole('switch', { name: 'Übungsbereich anbieten' })).toBeChecked();
    });

    it('uses the exact public master key rather than the legacy Admin spelling', () => {
        state.settings = { enableWalkThrough: true, releaseToggles: { enablePracticeArea: true } };
        render(<CounsellorTutorialSettingsCardContainer />);
        expect(status('Rundgänge')).toHaveTextContent('Nicht gemeldet');
        expect(screen.getByRole('switch', { name: 'Rundgänge in Hilfe anzeigen' })).not.toBeChecked();
    });

    it.each([
        ['true', true, 'Verfügbar'],
        ['false', false, 'Ausgeschaltet'],
        ['enabled', false, 'Nicht gemeldet'],
        [{ value: true }, false, 'Nicht gemeldet'],
    ])('normalizes only exact server release-flag strings: %j', (flag, checked, expectedStatus) => {
        state.settings = { enableWalkthrough: true, releaseToggles: { enablePracticeArea: flag } };
        render(<CounsellorTutorialSettingsCardContainer />);
        expect(status('Übungsbereich')).toHaveTextContent(expectedStatus);
        expect(screen.getByRole('switch', { name: 'Übungsbereich anbieten' })).toHaveProperty('checked', checked);
    });

    it('does not mutate server or local settings when the unavailable controls are clicked or used by keyboard', async () => {
        state.settings = { enableWalkthrough: true, releaseToggles: { enablePracticeArea: true } };
        render(<CounsellorTutorialSettingsCardContainer />);
        const controls = screen
            .getAllByRole('switch')
            .filter((control) => control !== screen.getByRole('switch', { name: 'Rundgänge in Hilfe anzeigen' }));
        expect(controls).toHaveLength(3);
        const before = controls.map((control) => (control as HTMLInputElement).checked);
        controls.forEach((control) => expect(control).toBeDisabled());
        const practice = screen.getByRole('switch', { name: 'Übungsbereich anbieten' });
        await userEvent.click(practice.closest('label')!);
        practice.focus();
        await userEvent.keyboard(' {Enter}');
        expect(practice).not.toHaveFocus();
        expect(controls.map((control) => (control as HTMLInputElement).checked)).toEqual(before);
        expect(state.mutateSettings).not.toHaveBeenCalled();
        expect(state.setManualSettings).not.toHaveBeenCalled();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.getByText('Kommt bald')).toBeVisible();
    });

    it.each([
        [true, false],
        [false, true],
    ])('lets the platform admin switch tours from %s to %s (Admin#1205)', async (stored, next) => {
        state.settings = { enableWalkthrough: stored };
        render(<CounsellorTutorialSettingsCardContainer />);
        const tours = screen.getByRole('switch', { name: 'Rundgänge in Hilfe anzeigen' });
        expect(tours).toBeEnabled();
        expect(tours).toHaveProperty('checked', stored);

        await userEvent.click(tours);

        expect(state.mutateSettings).toHaveBeenCalledTimes(1);
        expect(state.mutateSettings.mock.calls[0][0]).toEqual({ enableWalkthrough: next });
    });

    it('shows the requested value and blocks a second toggle while the save runs', () => {
        state.settings = { enableWalkthrough: true };
        state.mutation = { isPending: true, variables: { enableWalkthrough: false } };
        render(<CounsellorTutorialSettingsCardContainer />);
        const tours = screen.getByRole('switch', { name: 'Rundgänge in Hilfe anzeigen' });
        expect(tours).not.toBeChecked();
        expect(tours).toBeDisabled();
        expect(status('Rundgänge')).toHaveTextContent('Ausgeschaltet');
    });

    it('reports a failed save and shows the stored value again', async () => {
        state.settings = { enableWalkthrough: true };
        state.mutateSettings.mockImplementation((_data, options?: { onError?: () => void }) => options?.onError?.());
        const { rerender } = render(<CounsellorTutorialSettingsCardContainer />);
        await userEvent.click(screen.getByRole('switch', { name: 'Rundgänge in Hilfe anzeigen' }));

        expect(state.messageError).toHaveBeenCalledWith(
            expect.objectContaining({
                content:
                    'Die Einstellung für Rundgänge konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.',
            }),
        );
        rerender(<CounsellorTutorialSettingsCardContainer />);
        await waitFor(() => expect(screen.getByRole('switch', { name: 'Rundgänge in Hilfe anzeigen' })).toBeChecked());
    });

    it('shows the tours switch read-only to admins who may not change it', async () => {
        state.isSuperAdmin = false;
        state.settings = { enableWalkthrough: true };
        render(<CounsellorTutorialSettingsCardContainer />);
        const tours = screen.getByRole('switch', { name: 'Rundgänge in Hilfe anzeigen' });
        expect(tours).toBeChecked();
        expect(tours).toBeDisabled();
        await userEvent.click(tours.closest('label')!);
        expect(state.mutateSettings).not.toHaveBeenCalled();
    });

    it.each([
        [
            'de',
            'Tutorials für Berater',
            'Einführung bei neuen Beraterkonten automatisch starten',
            'Kommt bald',
            'Bestehende Einstellungen bleiben erhalten.',
        ],
        [
            'en',
            'Counsellor tutorials',
            'Automatically start the introduction for new counsellor accounts',
            'Coming soon',
            'Existing preferences are retained.',
        ],
    ])(
        'separates the planned new-account default from actual availability in %s',
        async (locale, title, label, notice, existing) => {
            await i18n.changeLanguage(locale);
            render(<CounsellorTutorialSettingsCard toursEnabled practiceEnabled />);
            expect(screen.getByRole('heading', { name: title })).toBeVisible();
            expect(screen.getByRole('switch', { name: label })).toBeDisabled();
            expect(screen.getByRole('switch', { name: label })).not.toBeChecked();
            expect(screen.getByText(notice)).toBeVisible();
            expect(screen.getByText(new RegExp(existing))).toBeVisible();
        },
    );
});
