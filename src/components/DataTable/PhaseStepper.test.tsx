import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhaseStepper, PhaseStepperPhase } from './PhaseStepper';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

const PHASES: PhaseStepperPhase[] = [
    { key: 'invited', label: 'Eingeladen', state: 'done' },
    { key: 'registered', label: 'Registriert', state: 'current' },
    { key: 'completed', label: 'Abgeschlossen', state: 'pending' },
];

describe('PhaseStepper', () => {
    it('announces every phase with its state to screen readers', () => {
        render(<PhaseStepper phases={PHASES} ariaLabel="Onboarding-Fortschritt" />);

        expect(screen.getByRole('list', { name: 'Onboarding-Fortschritt' })).toBeInTheDocument();
        expect(screen.getByText('Eingeladen – abgeschlossen')).toBeInTheDocument();
        expect(screen.getByText('Registriert – aktueller Schritt')).toBeInTheDocument();
        expect(screen.getByText('Abgeschlossen – ausstehend')).toBeInTheDocument();
    });

    it('surfaces the current phase label visually', () => {
        render(<PhaseStepper phases={PHASES} />);
        // Once via the visible label, once via the sr-only phrase.
        expect(screen.getAllByText(/Registriert/)).toHaveLength(2);
    });

    it('surfaces the error phase label when a phase failed', () => {
        render(
            <PhaseStepper
                phases={[
                    { key: 'invited', label: 'Eingeladen', state: 'done' },
                    { key: 'registered', label: 'Registriert', state: 'error' },
                    { key: 'completed', label: 'Abgeschlossen', state: 'pending' },
                ]}
            />,
        );
        expect(screen.getByText('Registriert – fehlgeschlagen')).toBeInTheDocument();
        expect(screen.getAllByText(/Registriert/)).toHaveLength(2);
    });

    it('shows the final label when everything is done', () => {
        render(
            <PhaseStepper
                phases={[
                    { key: 'invited', label: 'Eingeladen', state: 'done' },
                    { key: 'completed', label: 'Abgeschlossen', state: 'done' },
                ]}
            />,
        );
        expect(screen.getAllByText(/Abgeschlossen/)).toHaveLength(2);
    });

    it('can hide the visible label for ultra-compact cells', () => {
        render(<PhaseStepper phases={PHASES} showActiveLabel={false} />);
        // Only the sr-only phrase remains.
        expect(screen.getAllByText(/Registriert/)).toHaveLength(1);
    });

    // C1 + C2: two rows both labelled "Eingeladen" showed different beads (an
    // orange "!" versus a black dot) with no explanation anywhere, and the track
    // had no hover affordance at all — reached or not.
    it('explains every milestone on hover, reached and not yet reached (C1/C2)', async () => {
        const user = userEvent.setup();
        render(<PhaseStepper phases={PHASES} />);

        await user.hover(screen.getByText('Eingeladen – abgeschlossen'));
        expect(await screen.findByRole('tooltip')).toHaveTextContent('Eingeladen: dieser Schritt ist abgeschlossen.');
        await user.unhover(screen.getByText('Eingeladen – abgeschlossen'));

        // A milestone the invite has not reached explains itself too.
        await user.hover(screen.getByText('Abgeschlossen – ausstehend'));
        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Abgeschlossen: dieser Schritt wurde noch nicht erreicht.',
        );
    });

    it('tells the two identically labelled "Eingeladen" beads apart (C2)', async () => {
        const user = userEvent.setup();
        render(
            <PhaseStepper
                phases={[
                    { key: 'invited', label: 'Eingeladen', state: 'warning' },
                    { key: 'completed', label: 'Abgeschlossen', state: 'pending' },
                ]}
            />,
        );

        await user.hover(screen.getByText('Eingeladen – Zustellproblem'));
        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Eingeladen: die E-Mail konnte nicht zugestellt werden.',
        );
    });

    it('makes every milestone reachable by keyboard', () => {
        render(<PhaseStepper phases={PHASES} />);
        screen.getAllByRole('listitem').forEach((item) => {
            expect(item.querySelector('[tabindex="0"]')).not.toBeNull();
        });
    });
});
