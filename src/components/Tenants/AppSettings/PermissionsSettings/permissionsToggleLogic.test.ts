import { describe, expect, it, vi } from 'vitest';
import { buildTogglePayload, syncMasterChildTogglesInForm } from './permissionsToggleLogic';

const masterToggleChildren = {
    featureCallsEnabled: ['featureAudioCallsEnabled', 'featureVideoCallsEnabled'],
};

describe('permissions toggle logic', () => {
    it('builds a nested payload and disables children when a master toggle is turned off', () => {
        expect(buildTogglePayload(['settings', 'featureCallsEnabled'], false, masterToggleChildren)).toEqual({
            settings: {
                featureAudioCallsEnabled: false,
                featureCallsEnabled: false,
                featureVideoCallsEnabled: false,
            },
        });
    });

    it('does not touch child toggles when a master toggle is turned on', () => {
        expect(buildTogglePayload(['settings', 'featureCallsEnabled'], true, masterToggleChildren)).toEqual({
            settings: {
                featureCallsEnabled: true,
            },
        });
    });

    it('syncs child fields in an antd form when a master toggle is disabled', () => {
        const form = { setFields: vi.fn() } as any;

        syncMasterChildTogglesInForm(form, ['settings', 'featureCallsEnabled'], false, masterToggleChildren);

        expect(form.setFields).toHaveBeenCalledWith([
            { name: ['settings', 'featureAudioCallsEnabled'], value: false },
            { name: ['settings', 'featureVideoCallsEnabled'], value: false },
        ]);
    });
});
