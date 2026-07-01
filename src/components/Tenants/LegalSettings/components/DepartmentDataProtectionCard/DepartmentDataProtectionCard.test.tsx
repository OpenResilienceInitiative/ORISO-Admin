import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepartmentDataProtectionCard } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));

// TipTap pulls heavy editor deps; stub it to a plain node that echoes its value.
vi.mock('../../../../FormPluginEditor/TiptapEditor', () => ({
    default: ({ value }: { value: string }) => <div data-testid="editor" data-value={value} />,
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

describe('DepartmentDataProtectionCard', () => {
    it('publishes the current content (publish=true)', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<DepartmentDataProtectionCard initialContent="<p>x</p>" onSave={onSave} />);

        await user.click(screen.getByRole('button', { name: 'Veröffentlichen' }));

        expect(onSave).toHaveBeenCalledWith('<p>x</p>', true);
    });

    it('stores a draft (publish=false)', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<DepartmentDataProtectionCard initialContent="<p>x</p>" onSave={onSave} />);

        await user.click(screen.getByRole('button', { name: 'Als Entwurf speichern' }));

        expect(onSave).toHaveBeenCalledWith('<p>x</p>', false);
    });

    it('shows the published status tag', () => {
        render(
            <DepartmentDataProtectionCard publicationStatus="PUBLISHED" onSave={() => undefined} />,
        );
        expect(screen.getByText('Veröffentlicht')).toBeInTheDocument();
    });

    it('shows the draft status tag by default', () => {
        render(<DepartmentDataProtectionCard onSave={() => undefined} />);
        expect(screen.getByText('Entwurf')).toBeInTheDocument();
    });

    it('renders the department name when provided', () => {
        render(
            <DepartmentDataProtectionCard departmentName="Suchtberatung" onSave={() => undefined} />,
        );
        expect(screen.getByText('Suchtberatung')).toBeInTheDocument();
    });
});
