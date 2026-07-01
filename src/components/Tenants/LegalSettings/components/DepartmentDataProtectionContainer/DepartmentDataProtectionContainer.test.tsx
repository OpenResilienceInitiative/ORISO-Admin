import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepartmentDataProtectionContainer } from './index';

const { useDepartmentDpp, publishMutate, useTranslation } = vi.hoisted(() => ({
    useDepartmentDpp: vi.fn(),
    publishMutate: vi.fn(),
    useTranslation: vi.fn(() => ({ i18n: { language: 'de' } })),
}));

vi.mock('react-i18next', () => ({ useTranslation }));
vi.mock('../../../../../hooks/useDepartmentDpp.hook', () => ({ useDepartmentDpp }));
vi.mock('../../../../../hooks/usePublishDepartmentDpp.hook', () => ({
    usePublishDepartmentDpp: () => ({ mutate: publishMutate, isPending: false }),
}));

// Stub the card to a plain node that echoes props and exposes onSave.
vi.mock('../DepartmentDataProtectionCard', () => ({
    DepartmentDataProtectionCard: ({ initialContent, publicationStatus, departmentName, onSave }: any) => (
        <div
            data-testid="card"
            data-content={initialContent}
            data-status={publicationStatus}
            data-name={departmentName}
        >
            <button type="button" onClick={() => onSave('<p>edited</p>', true)}>
                save
            </button>
        </div>
    ),
}));

beforeEach(() => {
    publishMutate.mockClear();
    useTranslation.mockReturnValue({ i18n: { language: 'de-DE' } });
});

describe('DepartmentDataProtectionContainer', () => {
    it('renders nothing while loading', () => {
        useDepartmentDpp.mockReturnValue({ data: undefined, isLoading: true });
        const { container } = render(
            <DepartmentDataProtectionContainer agencyId={7} topicId={42} departmentName="Sucht" />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('prefills the editor with the active-language content and status', () => {
        useDepartmentDpp.mockReturnValue({
            data: { content: '{"de":"<p>DE</p>","en":"<p>EN</p>"}', publicationStatus: 'PUBLISHED' },
            isLoading: false,
        });
        render(
            <DepartmentDataProtectionContainer agencyId={7} topicId={42} departmentName="Sucht" />,
        );
        const card = screen.getByTestId('card');
        expect(card).toHaveAttribute('data-content', '<p>DE</p>');
        expect(card).toHaveAttribute('data-status', 'PUBLISHED');
        expect(card).toHaveAttribute('data-name', 'Sucht');
    });

    it('publishes the edited HTML under the active language', async () => {
        const user = userEvent.setup();
        useDepartmentDpp.mockReturnValue({
            data: { content: null, publicationStatus: 'DRAFT' },
            isLoading: false,
        });
        render(<DepartmentDataProtectionContainer agencyId={7} topicId={42} />);

        await user.click(screen.getByRole('button', { name: 'save' }));

        expect(publishMutate).toHaveBeenCalledWith({ content: { de: '<p>edited</p>' }, publish: true });
    });

    it('falls back to empty content when nothing is stored', () => {
        useDepartmentDpp.mockReturnValue({ data: { content: null, publicationStatus: 'DRAFT' }, isLoading: false });
        render(<DepartmentDataProtectionContainer agencyId={7} topicId={42} />);
        expect(screen.getByTestId('card')).toHaveAttribute('data-content', '');
    });
});
