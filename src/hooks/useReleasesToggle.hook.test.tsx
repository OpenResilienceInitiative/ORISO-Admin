import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReleaseToggle } from '../enums/ReleaseToggle';
import { useReleasesToggle } from './useReleasesToggle.hook';

const mocks = vi.hoisted(() => ({
    settings: {
        releaseToggles: {
            featureTenantCreationEnabled: true,
            featureTenantAdminCanChangeTenantConfigurationEnabled: false,
        },
    },
}));

vi.mock('../context/useAppConfig', () => ({
    useAppConfigContext: () => ({
        settings: mocks.settings,
    }),
}));

const ReleasesToggleHarness = () => {
    const { isEnabled } = useReleasesToggle();

    return (
        <>
            <output aria-label="tenant-creation">
                {String(isEnabled(ReleaseToggle.TENANT_ADMIN_CREATING))}
            </output>
            <output aria-label="tenant-settings">
                {String(isEnabled(ReleaseToggle.TENANT_ADMIN_SETTINGS_EDIT))}
            </output>
            <output aria-label="missing-toggle">{String(isEnabled(ReleaseToggle.COUNSELLING_RELATIONS))}</output>
        </>
    );
};

describe('useReleasesToggle', () => {
    it('returns release toggle state from app config settings', () => {
        render(<ReleasesToggleHarness />);

        expect(screen.getByLabelText('tenant-creation')).toHaveTextContent('true');
        expect(screen.getByLabelText('tenant-settings')).toHaveTextContent('false');
        expect(screen.getByLabelText('missing-toggle')).toHaveTextContent('false');
    });
});
