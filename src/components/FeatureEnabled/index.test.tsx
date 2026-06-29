import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureEnabled } from './index';
import { ReleaseToggle } from '../../enums/ReleaseToggle';

const mocks = vi.hoisted(() => ({
    settings: { releaseToggles: {} as Record<string, boolean> },
}));

vi.mock('../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: mocks.settings }),
}));

describe('FeatureEnabled', () => {
    it('renders children when the release toggle is enabled', () => {
        mocks.settings.releaseToggles = { [ReleaseToggle.ConsultantBoundedToAgencies]: true };

        render(
            <FeatureEnabled feature={ReleaseToggle.ConsultantBoundedToAgencies}>
                <div>Feature content</div>
            </FeatureEnabled>,
        );

        expect(screen.getByText('Feature content')).toBeInTheDocument();
    });

    it('hides children when the release toggle is disabled', () => {
        mocks.settings.releaseToggles = { [ReleaseToggle.ConsultantBoundedToAgencies]: false };

        render(
            <FeatureEnabled feature={ReleaseToggle.ConsultantBoundedToAgencies}>
                <div>Feature content</div>
            </FeatureEnabled>,
        );

        expect(screen.queryByText('Feature content')).not.toBeInTheDocument();
    });
});
