import '@ant-design/v5-patch-for-react-19';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { CounsellorTutorialSettingsCard, CounsellorTutorialSettingsCardContainer } from '.';

const state = vi.hoisted(() => ({ settings: {} as Record<string, unknown> }));
vi.mock('../../../context/useAppConfig', () => ({ useAppConfigContext: () => ({ settings: state.settings }) }));
const status = (label: string) => within(screen.getByText(label).closest('div')!).getByRole('definition');

beforeEach(async () => {
    state.settings = {};
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

    it('does not change settings or send requests when the unavailable controls are clicked or used by keyboard', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        try {
            render(<CounsellorTutorialSettingsCard toursEnabled practiceEnabled />);
            const controls = screen.getAllByRole('switch');
            const before = controls.map((control) => (control as HTMLInputElement).checked);
            controls.forEach((control) => expect(control).toBeDisabled());
            const tours = screen.getByRole('switch', { name: 'Rundgänge in Hilfe anzeigen' });
            await userEvent.click(tours.closest('label')!);
            tours.focus();
            await userEvent.keyboard(' {Enter}');
            expect(tours).not.toHaveFocus();
            expect(controls.map((control) => (control as HTMLInputElement).checked)).toEqual(before);
            expect(fetchSpy).not.toHaveBeenCalled();
            expect(screen.queryByRole('button')).not.toBeInTheDocument();
            expect(screen.getByText('Kommt bald')).toBeVisible();
        } finally {
            fetchSpy.mockRestore();
        }
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
