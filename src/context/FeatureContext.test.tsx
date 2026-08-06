import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeatureFlag } from '../enums/FeatureFlag';
import { FeatureProvider, useFeatureContext } from './FeatureContext';

const tenantData = {
    settings: {
        featureAppointmentsEnabled: true,
        featureDemographicsEnabled: false,
        featureTopicsEnabled: false,
        topicsInRegistrationEnabled: true,
    },
} as any;

const publicTenantData = {
    settings: {
        featureTopicsEnabled: true,
        featureGroupChatV2Enabled: true,
        featureCentralDataProtectionTemplateEnabled: false,
    },
} as any;

const FeatureConsumer = () => {
    const { isEnabled, toggleFeature } = useFeatureContext();

    return (
        <>
            <output aria-label="appointments">{String(isEnabled(FeatureFlag.Appointments))}</output>
            <output aria-label="topics">{String(isEnabled(FeatureFlag.Topics))}</output>
            <output aria-label="registration-topics">{String(isEnabled(FeatureFlag.TopicsInRegistration))}</output>
            <output aria-label="group-chat">{String(isEnabled(FeatureFlag.GroupChatV2))}</output>
            <output aria-label="developer">{String(isEnabled(FeatureFlag.Developer))}</output>
            <button type="button" onClick={() => toggleFeature(FeatureFlag.Developer)}>
                Toggle developer
            </button>
        </>
    );
};

describe('FeatureContext', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('maps tenant and public tenant settings to feature flags', () => {
        render(
            <FeatureProvider tenantData={tenantData} publicTenantData={publicTenantData}>
                <FeatureConsumer />
            </FeatureProvider>,
        );

        expect(screen.getByLabelText('appointments')).toHaveTextContent('true');
        expect(screen.getByLabelText('topics')).toHaveTextContent('true');
        expect(screen.getByLabelText('registration-topics')).toHaveTextContent('true');
        expect(screen.getByLabelText('group-chat')).toHaveTextContent('true');
        expect(screen.getByLabelText('developer')).toHaveTextContent('false');
    });

    it('toggles a feature in context state', () => {
        render(
            <FeatureProvider tenantData={{} as any} publicTenantData={{} as any}>
                <FeatureConsumer />
            </FeatureProvider>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Toggle developer' }));

        expect(screen.getByLabelText('developer')).toHaveTextContent('true');
    });

    it('degrades to all flags off outside the provider without noisy error logging', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        render(<FeatureConsumer />);

        expect(screen.getByLabelText('appointments')).toHaveTextContent('false');
        expect(screen.getByLabelText('topics')).toHaveTextContent('false');
        expect(screen.getByLabelText('registration-topics')).toHaveTextContent('false');
        expect(screen.getByLabelText('group-chat')).toHaveTextContent('false');
        expect(screen.getByLabelText('developer')).toHaveTextContent('false');

        fireEvent.click(screen.getByRole('button', { name: 'Toggle developer' }));

        expect(screen.getByLabelText('developer')).toHaveTextContent('false');
        expect(consoleError).not.toHaveBeenCalled();
    });
});
