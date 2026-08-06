import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import useComponentVisible from './useComponentVisible';

const VisibilityHarness = ({ initialIsVisible = false }: { initialIsVisible?: boolean }) => {
    const { ref, isComponentVisible, setIsComponentVisible } = useComponentVisible(initialIsVisible);

    return (
        <>
            <div ref={ref}>
                <output aria-label="visibility">{String(isComponentVisible)}</output>
                <button type="button" onClick={() => setIsComponentVisible(true)}>
                    Show
                </button>
            </div>
            <button type="button">Outside</button>
        </>
    );
};

describe('useComponentVisible', () => {
    it('uses the provided initial visibility state', () => {
        render(<VisibilityHarness initialIsVisible />);

        expect(screen.getByLabelText('visibility')).toHaveTextContent('true');
    });

    it('can show the component via the returned setter', () => {
        render(<VisibilityHarness />);

        fireEvent.click(screen.getByRole('button', { name: 'Show' }));

        expect(screen.getByLabelText('visibility')).toHaveTextContent('true');
    });

    it('hides the component when Escape is pressed', () => {
        render(<VisibilityHarness initialIsVisible />);

        fireEvent.keyDown(document, { key: 'Escape' });

        expect(screen.getByLabelText('visibility')).toHaveTextContent('false');
    });

    it('hides the component when clicking outside the referenced element', () => {
        render(<VisibilityHarness initialIsVisible />);

        fireEvent.click(screen.getByRole('button', { name: 'Outside' }));

        expect(screen.getByLabelText('visibility')).toHaveTextContent('false');
    });
});
