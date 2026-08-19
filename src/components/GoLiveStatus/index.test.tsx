import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GoLiveStatus } from './index';

const conditions = (states: Array<'met' | 'open' | 'violated'>) =>
    states.map((state, index) => ({
        key: `condition-${index}`,
        label: `Condition ${index + 1}`,
        state,
    }));

describe('GoLiveStatus', () => {
    it('renders the conditions as an ordered sequence with their states', () => {
        render(
            <GoLiveStatus
                title="Go-Live-Status"
                description="Diese Bedingungen braucht die Beratungsstelle."
                conditions={conditions(['met', 'open', 'violated'])}
            />,
        );

        const items = screen.getAllByRole('listitem');
        expect(items).toHaveLength(3);
        expect(items[0]).toHaveTextContent('Condition 1');
        expect(items[0]).toHaveAttribute('data-condition-state', 'met');
        expect(items[1]).toHaveAttribute('data-condition-state', 'open');
        expect(items[2]).toHaveAttribute('data-condition-state', 'violated');
        // A section, deliberately NOT a card: it scopes the whole area.
        expect(screen.getByTestId('go-live-status').tagName).toBe('SECTION');
    });

    it('disables activating the switch while conditions are open', () => {
        const onChange = vi.fn();
        render(
            <GoLiveStatus
                title="Go-Live-Status"
                description="desc"
                conditions={conditions(['met', 'open'])}
                switchControl={{
                    checked: false,
                    label: 'Beratungsstelle für die Beratungsapp aktivieren',
                    onChange,
                }}
            />,
        );

        expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('always allows deactivating, even when a condition is violated', () => {
        const onChange = vi.fn();
        render(
            <GoLiveStatus
                title="Go-Live-Status"
                description="desc"
                conditions={conditions(['met', 'violated'])}
                switchControl={{
                    checked: true,
                    label: 'Beratungsstelle für die Beratungsapp aktivieren',
                    onChange,
                }}
            />,
        );

        const control = screen.getByRole('switch');
        expect(control).toBeEnabled();
        fireEvent.click(control);
        expect(onChange).toHaveBeenCalledWith(false);
    });

    it('activates via the switch once every condition is met', () => {
        const onChange = vi.fn();
        render(
            <GoLiveStatus
                title="Go-Live-Status"
                description="desc"
                conditions={conditions(['met', 'met'])}
                switchControl={{
                    checked: false,
                    label: 'Beratungsstelle für die Beratungsapp aktivieren',
                    onChange,
                }}
            />,
        );

        const control = screen.getByRole('switch');
        expect(control).toBeEnabled();
        fireEvent.click(control);
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('shows a hint on a condition when provided', () => {
        render(
            <GoLiveStatus
                title="Go-Live-Status"
                description="desc"
                conditions={[{ key: 'dpa', label: 'AVV unterschrieben', state: 'violated', hint: 'Version veraltet' }]}
            />,
        );

        expect(screen.getByText('Version veraltet')).toBeInTheDocument();
    });
});
