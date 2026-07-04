import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataProcessingAgreementContainer } from './index';

const { useDpaVersions, publishMutate, useTranslation, useTenantAdminData } = vi.hoisted(() => ({
    useDpaVersions: vi.fn(),
    publishMutate: vi.fn(),
    useTranslation: vi.fn(),
    useTenantAdminData: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation }));
vi.mock('../../../../../hooks/useDpaVersions.hook', () => ({ useDpaVersions }));
vi.mock('../../../../../hooks/useTenantAdminData.hook', () => ({ useTenantAdminData }));
vi.mock('../../../../../hooks/usePublishDpa.hook', () => ({
    usePublishDpa: () => ({ mutate: publishMutate, isPending: false }),
}));
vi.mock('../../../../../hooks/useTranslateLegalContent.hook', () => ({
    useTranslateLegalContent: () => ({ translate: vi.fn(), isTranslating: false }),
}));

// Stub the card to a plain node that echoes props and exposes onPublish.
vi.mock('../DataProcessingAgreementCard', () => ({
    DataProcessingAgreementCard: ({
        initialContentByLanguage,
        languages,
        defaultLanguage,
        versions,
        readOnly,
        onPublish,
    }: any) => (
        <div
            data-testid="card"
            data-content={JSON.stringify(initialContentByLanguage)}
            data-languages={(languages ?? []).join(',')}
            data-default-language={defaultLanguage}
            data-labels={(versions ?? []).map((v: any) => v.label).join('|')}
            data-contents={(versions ?? []).map((v: any) => v.content).join('|')}
            data-read-only={readOnly ? 'true' : 'false'}
        >
            <button type="button" onClick={() => onPublish({ ...initialContentByLanguage, en: '<p>edited</p>' })}>
                publish
            </button>
        </div>
    ),
}));

beforeEach(() => {
    publishMutate.mockClear();
    useDpaVersions.mockReset();
    useDpaVersions.mockReturnValue({ data: [] });
    useTranslation.mockReturnValue({
        t: (key: string) => key,
        i18n: { language: 'de-DE' },
    });
    useTenantAdminData.mockReturnValue({ data: { settings: { activeLanguages: ['de', 'en'] } } });
});

describe('DataProcessingAgreementContainer', () => {
    it('passes the complete latest content map and the editable languages to the card', () => {
        useDpaVersions.mockReturnValue({
            data: [
                {
                    activationDate: '2026-07-01T10:00:00',
                    content: '{"de":"<p>DE</p>","fr":"<p>FR</p>","de__meta":"m"}',
                },
            ],
        });
        render(<DataProcessingAgreementContainer tenantId={1} />);
        const card = screen.getByTestId('card');
        expect(JSON.parse(card.getAttribute('data-content') ?? '{}')).toEqual({
            de: '<p>DE</p>',
            fr: '<p>FR</p>',
            de__meta: 'm',
        });
        // active languages + stored fr, but never the metadata key
        expect(card).toHaveAttribute('data-languages', 'de,en,fr');
        expect(card).toHaveAttribute('data-default-language', 'de');
    });

    it('marks the newest version as current and shows the active-language text per version', () => {
        useDpaVersions.mockReturnValue({
            data: [
                { activationDate: '2026-07-01T10:00:00', content: '{"de":"<p>neu</p>","en":"<p>new</p>"}' },
                { activationDate: '2026-05-01T09:00:00', content: '{"de":"<p>alt</p>"}' },
            ],
        });
        render(<DataProcessingAgreementContainer tenantId={1} />);
        const card = screen.getByTestId('card');
        const labels = (card.getAttribute('data-labels') ?? '').split('|');
        expect(labels[0]).toContain('tenants.legal.version.current');
        expect(labels[1]).not.toContain('tenants.legal.version.current');
        expect(card).toHaveAttribute('data-contents', '<p>neu</p>|<p>alt</p>');
    });

    it('publishes the complete merged map the card emits — other languages are kept', async () => {
        const user = userEvent.setup();
        useDpaVersions.mockReturnValue({
            data: [{ activationDate: '2026-07-01T10:00:00', content: '{"de":"<p>DE</p>"}' }],
        });
        render(<DataProcessingAgreementContainer tenantId={1} />);

        await user.click(screen.getByRole('button', { name: 'publish' }));

        expect(publishMutate).toHaveBeenCalledWith({ de: '<p>DE</p>', en: '<p>edited</p>' });
    });

    it('forwards read-only mode to the card', () => {
        render(<DataProcessingAgreementContainer tenantId={1} readOnly />);
        expect(screen.getByTestId('card')).toHaveAttribute('data-read-only', 'true');
    });

    it('disables the versions query when there is no usable tenant id', () => {
        render(<DataProcessingAgreementContainer tenantId="" />);
        expect(useDpaVersions).toHaveBeenCalledWith(0, false);
    });
});
