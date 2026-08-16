import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegalTextSettings } from './index';
import { AgencyData } from '../../../../../types/agency';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: { language: 'de' },
        t: (key: string, options?: unknown) =>
            options && typeof options === 'object' ? `${key}:${Object.values(options).join(':')}` : key,
    }),
}));

const mocks = vi.hoisted(() => ({
    tenantConsent: undefined as Record<string, string> | undefined,
}));

vi.mock('../../../../../hooks/useLegalTextVersions.hook', () => ({ useLegalTextVersions: () => ({ data: [] }) }));
vi.mock('../../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({
        data: {
            id: 1,
            content: { privacy: { de: '<p>Tenant DE</p>' }, privacyConsent: mocks.tenantConsent },
            settings: { activeLanguages: ['de'] },
        },
        isLoading: false,
    }),
}));
vi.mock('../../../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => true }) }));
vi.mock('../../../../../context/FeatureContext', () => ({ useFeatureContext: () => ({ isEnabled: () => false }) }));

vi.mock('../../../../../components/FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({
        value,
        onPublish,
        belowSlot,
    }: {
        value?: string;
        onPublish?: () => void;
        belowSlot?: React.ReactNode;
    }) => (
        <div data-testid="m3-editor" data-value={value}>
            {onPublish && (
                <button type="button" onClick={() => onPublish()}>
                    publish
                </button>
            )}
            {belowSlot}
        </div>
    ),
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => false,
        }),
    });
});

const agency = (content?: AgencyData['content']) => ({ id: 5, tenantId: 1, content } as unknown as AgencyData);

describe('LegalTextSettings — consent sentence (Beratungsstelle level)', () => {
    it('is not offered while no level of the ladder carries the field', () => {
        mocks.tenantConsent = undefined;
        render(<LegalTextSettings agencyData={agency({})} field="privacy" onSave={() => undefined} />);
        expect(screen.queryByTestId('consent-fixed-addendum')).not.toBeInTheDocument();
    });

    it('is never offered on the imprint', () => {
        mocks.tenantConsent = { de: 'Ich habe {{legal_links}} gelesen.' };
        render(<LegalTextSettings agencyData={agency({})} field="impressum" onSave={() => undefined} />);
        expect(screen.queryByTestId('consent-fixed-addendum')).not.toBeInTheDocument();
    });

    it('shows the inherited Träger sentence and does not persist it as an agency override', async () => {
        mocks.tenantConsent = { de: 'Ich habe {{legal_links}} gelesen.' };
        const onSave = vi.fn();
        render(<LegalTextSettings agencyData={agency({})} field="privacy" onSave={onSave} />);
        expect(screen.getByText('legal.consent.inherited:legal.consent.level.tenant')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'publish' }));
        expect(onSave).toHaveBeenCalledWith({ content: { privacy: {}, privacyConsent: {} } });
    });

    it('publishes the agency override once one exists', async () => {
        mocks.tenantConsent = { de: 'Ich habe {{legal_links}} gelesen.' };
        const onSave = vi.fn();
        render(
            <LegalTextSettings
                agencyData={agency({ privacyConsent: { de: 'Beratungsstellensatz mit {{legal_links}}.' } })}
                field="privacy"
                onSave={onSave}
            />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'publish' }));
        expect(onSave).toHaveBeenCalledWith({
            content: { privacy: {}, privacyConsent: { de: 'Beratungsstellensatz mit {{legal_links}}.' } },
        });
    });

    it('refuses to publish an override that dropped {{legal_links}}', async () => {
        mocks.tenantConsent = { de: 'Ich habe {{legal_links}} gelesen.' };
        const onSave = vi.fn();
        render(
            <LegalTextSettings
                agencyData={agency({ privacyConsent: { de: 'Ich stimme zu.' } })}
                field="privacy"
                onSave={onSave}
            />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'publish' }));
        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByTestId('consent-publish-blocked')).toBeInTheDocument();
    });
});
