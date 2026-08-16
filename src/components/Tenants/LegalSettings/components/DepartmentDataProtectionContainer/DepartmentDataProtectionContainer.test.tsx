import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepartmentDataProtectionContainer } from './index';

const { useDepartmentDpp, publishMutate, useTranslation, useTenantAdminData } = vi.hoisted(() => ({
    useDepartmentDpp: vi.fn(),
    publishMutate: vi.fn(),
    useTranslation: vi.fn(() => ({ i18n: { language: 'de' } })),
    useTenantAdminData: vi.fn(() => ({ data: { settings: { activeLanguages: ['de', 'en'] } } })),
}));

vi.mock('react-i18next', () => ({ useTranslation }));
vi.mock('../../../../../hooks/useDepartmentDpp.hook', () => ({ useDepartmentDpp }));
vi.mock('../../../../../hooks/useTenantAdminData.hook', () => ({ useTenantAdminData }));
vi.mock('../../../../../hooks/usePublishDepartmentDpp.hook', () => ({
    usePublishDepartmentDpp: () => ({ mutate: publishMutate, isPending: false }),
}));

// Stub the card to a plain node that echoes props and exposes onSave.
vi.mock('../../../../../hooks/useTranslateLegalContent.hook', () => ({
    useTranslateLegalContent: () => ({ translate: vi.fn(), isTranslating: false }),
}));

vi.mock('../DepartmentDataProtectionCard', () => ({
    DepartmentDataProtectionCard: ({
        initialContentByLanguage,
        languages,
        defaultLanguage,
        publicationStatus,
        departmentName,
        onSave,
    }: any) => (
        <div
            data-testid="card"
            data-content={JSON.stringify(initialContentByLanguage)}
            data-languages={(languages ?? []).join(',')}
            data-default-language={defaultLanguage}
            data-status={publicationStatus}
            data-name={departmentName}
        >
            <button type="button" onClick={() => onSave({ ...initialContentByLanguage, en: '<p>edited</p>' }, true)}>
                save
            </button>
        </div>
    ),
}));

beforeEach(() => {
    publishMutate.mockClear();
    useTranslation.mockReturnValue({ i18n: { language: 'de-DE' } });
    useTenantAdminData.mockReturnValue({ data: { settings: { activeLanguages: ['de', 'en'] } } });
});

describe('DepartmentDataProtectionContainer', () => {
    it('renders nothing while loading', () => {
        useDepartmentDpp.mockReturnValue({ data: undefined, isLoading: true });
        const { container } = render(
            <DepartmentDataProtectionContainer agencyId={7} topicId={42} departmentName="Sucht" />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('passes the complete content map, languages and status to the card', () => {
        useDepartmentDpp.mockReturnValue({
            data: {
                content: '{"de":"<p>DE</p>","en":"<p>EN</p>","fr":"<p>FR</p>","de__meta":"m"}',
                publicationStatus: 'PUBLISHED',
            },
            isLoading: false,
        });
        render(<DepartmentDataProtectionContainer agencyId={7} topicId={42} departmentName="Sucht" />);
        const card = screen.getByTestId('card');
        expect(JSON.parse(card.getAttribute('data-content') ?? '{}')).toEqual({
            de: '<p>DE</p>',
            en: '<p>EN</p>',
            fr: '<p>FR</p>',
            de__meta: 'm',
        });
        // active languages + stored fr, but never the metadata key
        expect(card).toHaveAttribute('data-languages', 'de,en,fr');
        // The container no longer forces the admin's UI language on the editor — the card
        // opens on the legal source language itself (#718).
        expect(card).not.toHaveAttribute('data-default-language');
        expect(card).toHaveAttribute('data-status', 'PUBLISHED');
        expect(card).toHaveAttribute('data-name', 'Sucht');
    });

    it('exposes legacy plain content under de', () => {
        useDepartmentDpp.mockReturnValue({
            data: { content: '<p>plain legacy</p>', publicationStatus: 'DRAFT' },
            isLoading: false,
        });
        render(<DepartmentDataProtectionContainer agencyId={7} topicId={42} />);
        expect(JSON.parse(screen.getByTestId('card').getAttribute('data-content') ?? '{}')).toEqual({
            de: '<p>plain legacy</p>',
        });
    });

    it('publishes the complete merged map the card emits — other languages are kept', async () => {
        const user = userEvent.setup();
        useDepartmentDpp.mockReturnValue({
            data: { content: '{"de":"<p>DE</p>"}', publicationStatus: 'DRAFT' },
            isLoading: false,
        });
        render(<DepartmentDataProtectionContainer agencyId={7} topicId={42} />);

        await user.click(screen.getByRole('button', { name: 'save' }));

        expect(publishMutate).toHaveBeenCalledWith({
            content: { de: '<p>DE</p>', en: '<p>edited</p>' },
            publish: true,
        });
    });

    it('falls back to an empty map when nothing is stored', () => {
        useDepartmentDpp.mockReturnValue({ data: { content: null, publicationStatus: 'DRAFT' }, isLoading: false });
        render(<DepartmentDataProtectionContainer agencyId={7} topicId={42} />);
        expect(screen.getByTestId('card')).toHaveAttribute('data-content', '{}');
    });
});
