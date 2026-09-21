import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CollapsibleField } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, defaultValue?: string, options?: Record<string, unknown>) => {
            let text = defaultValue ?? key;
            Object.entries(options ?? {}).forEach(([name, replacement]) => {
                text = text.replace(`{{${name}}}`, String(replacement));
            });
            return text;
        },
    }),
}));

const Harness = ({ initiallyCollapsed = false }: { initiallyCollapsed?: boolean }) => {
    const [value, setValue] = useState('maria@example.org');
    const [collapsed, setCollapsed] = useState(initiallyCollapsed);
    return (
        <CollapsibleField
            collapsed={collapsed}
            label="E-Mail"
            valueSummary={value}
            onExpand={() => setCollapsed(false)}
        >
            <input
                aria-label="E-Mail"
                value={value}
                onBlur={() => setCollapsed(value.includes('@'))}
                onChange={(event) => setValue(event.target.value)}
            />
        </CollapsibleField>
    );
};

describe('CollapsibleField (#1026)', () => {
    it('shows a "✓ Label" pill that names the hidden value', () => {
        render(<Harness initiallyCollapsed />);

        const pill = screen.getByRole('button', { name: 'E-Mail bearbeiten: maria@example.org' });
        expect(pill).toHaveTextContent('E-Mail');
        expect(pill).toHaveAttribute('title', 'maria@example.org');
        // The field stays mounted underneath — only hidden.
        expect(screen.getByLabelText('E-Mail', { selector: 'input' })).not.toBeVisible();
    });

    it('expands on click with focus and the caret at the end, and collapses again on blur', async () => {
        const user = userEvent.setup();
        render(<Harness initiallyCollapsed />);

        await user.click(screen.getByRole('button', { name: /E-Mail bearbeiten/ }));
        const input = screen.getByRole('textbox', { name: 'E-Mail' });
        expect(input).toHaveFocus();
        expect((input as HTMLInputElement).selectionStart).toBe('maria@example.org'.length);

        await user.tab();
        expect(screen.getByRole('button', { name: /E-Mail bearbeiten/ })).toBeInTheDocument();
    });

    it('keeps an invalid value expanded', async () => {
        const user = userEvent.setup();
        render(<Harness />);

        const input = screen.getByRole('textbox', { name: 'E-Mail' });
        await user.clear(input);
        await user.type(input, 'maria');
        await user.tab();
        expect(screen.queryByRole('button', { name: /E-Mail bearbeiten/ })).not.toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'E-Mail' })).toBeVisible();
    });
});
