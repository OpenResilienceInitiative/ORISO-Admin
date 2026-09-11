import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { MobileNavProvider, useMobileNav, useRegisterMobileNav } from './MobileNavContext';

/**
 * Regression guard for ORISO-Admin#702 / ORISO-E2E#57.
 *
 * `MobileNavProvider` used to rebuild its `register` callback whenever the merged
 * registration changed, while `useRegisterMobileNav` listed `register` in its effect
 * dependencies. Registering therefore invalidated the very function that had just been
 * used to register, re-running the effect forever: React aborted the render pass with
 * "Maximum update depth exceeded" (minified error #185).
 *
 * Because that abort happens inside a `startTransition` (react-router wraps every
 * navigation in one), it never surfaced as a crash — the admin panel simply stopped
 * re-rendering: the URL advanced and the page kept showing the previous screen.
 */

/** Counts its own renders so a non-converging update loop is visible as a number. */
const RegisteringPage = ({ label }: { label: string }) => {
    const renders = useRef(0);
    renders.current += 1;

    useRegisterMobileNav('page', {
        subsections: [{ key: '/a', label: 'A', to: '/a' }],
        activeSubsectionKey: '/a',
        backPath: '/back',
        backLabel: label,
    });

    return <div data-testid="renders">{renders.current}</div>;
};

const Consumer = () => {
    const registration = useMobileNav();
    return <div data-testid="back-label">{registration?.backLabel ?? 'none'}</div>;
};

describe('MobileNavProvider', () => {
    it('settles after a page registers instead of looping forever', () => {
        render(
            <MobileNavProvider>
                <RegisteringPage label="Zurück" />
                <Consumer />
            </MobileNavProvider>,
        );

        // The registration must reach the bar...
        expect(screen.getByTestId('back-label')).toHaveTextContent('Zurück');
        // ...and registering must not feed itself a new `register` identity forever.
        expect(Number(screen.getByTestId('renders').textContent)).toBeLessThan(10);
    });

    it('keeps the register callback referentially stable across registrations', () => {
        const seen = new Set<unknown>();

        const Probe = () => {
            useRegisterMobileNav('probe', { backLabel: 'x' });
            const registration = useMobileNav();
            return <span>{registration?.backLabel ?? '-'}</span>;
        };

        const Spy = () => {
            const registration = useMobileNav();
            seen.add(registration);
            return null;
        };

        render(
            <MobileNavProvider>
                <Probe />
                <Spy />
            </MobileNavProvider>,
        );

        // null + the single merged registration — not one object per loop iteration.
        expect(seen.size).toBeLessThanOrEqual(3);
    });
});
