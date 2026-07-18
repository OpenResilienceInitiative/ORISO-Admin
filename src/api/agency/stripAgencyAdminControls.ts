import { AgencySettings } from '../../types/agency';

/**
 * Removes the injected platform-wide `agencyAdminControls` from an agency's settings before
 * they are sent back to the AgencyService. Echoing them would turn a plain agency save into a
 * platform-controls update, which only the super admin may perform (403 for everyone else).
 */
export const stripAgencyAdminControls = (settings: AgencySettings): Omit<AgencySettings, 'agencyAdminControls'> => {
    const { agencyAdminControls, ...rest } = settings;
    return rest;
};
