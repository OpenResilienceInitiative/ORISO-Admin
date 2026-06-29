import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UseAppConfigProvider, useAppConfigContext } from './useAppConfig';

vi.mock('../appConfig', () => ({
    clusterFeatureFlags: {
        useApiClusterSettings: true,
    },
}));

const AppConfigConsumer = () => {
    const { settings, setManualSettings, setServerSettings } = useAppConfigContext();

    return (
        <>
            <output aria-label="api-cluster">{String(settings.useApiClusterSettings)}</output>
            <output aria-label="tenant-creation">{String(settings.featureTenantCreationEnabled)}</output>
            <output aria-label="release-toggle">
                {String(settings.releaseToggles?.featureTenantCreationEnabled)}
            </output>
            <button
                type="button"
                onClick={() =>
                    setServerSettings({
                        featureTenantCreationEnabled: { value: true },
                        releaseToggles: { featureTenantCreationEnabled: false },
                    } as any)
                }
            >
                Apply server settings
            </button>
            <button type="button" onClick={() => setManualSettings({ useApiClusterSettings: false })}>
                Apply manual settings
            </button>
        </>
    );
};

describe('useAppConfigContext', () => {
    it('starts with cluster feature flag defaults', () => {
        render(
            <UseAppConfigProvider>
                <AppConfigConsumer />
            </UseAppConfigProvider>,
        );

        expect(screen.getByLabelText('api-cluster')).toHaveTextContent('true');
    });

    it('stores server settings values and their metadata', () => {
        render(
            <UseAppConfigProvider>
                <AppConfigConsumer />
            </UseAppConfigProvider>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Apply server settings' }));

        expect(screen.getByLabelText('tenant-creation')).toHaveTextContent('true');
        expect(screen.getByLabelText('release-toggle')).toHaveTextContent('false');
    });

    it('merges manual settings with the current config', () => {
        render(
            <UseAppConfigProvider>
                <AppConfigConsumer />
            </UseAppConfigProvider>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Apply manual settings' }));

        expect(screen.getByLabelText('api-cluster')).toHaveTextContent('false');
    });
});
