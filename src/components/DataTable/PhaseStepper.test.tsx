import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
