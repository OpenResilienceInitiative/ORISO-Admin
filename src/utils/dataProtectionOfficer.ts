import { TenantDataProtectionOfficer } from '../types/tenant';

const present = (value?: string | null) => (value && value.trim() !== '' ? value.trim() : undefined);

/**
 * Whether the Beratungsstelle names its own DPO — the same rule AgencyService applies when it fills
 * `{{Datenschutzbeauftragte}}`: "Datenschutzbeauftragte:r" chosen and a name entered. Otherwise the
 * Träger's DPO is inherited (ORISO-Admin#1067).
 */
export const hasOwnAgencyDpo = (dataProtection?: {
    dataProtectionResponsibleEntity?: string | null;
    dataProtectionOfficerContact?: TenantDataProtectionOfficer | null;
}) =>
    dataProtection?.dataProtectionResponsibleEntity === 'DATA_PROTECTION_OFFICER' &&
    !!present(dataProtection.dataProtectionOfficerContact?.nameAndLegalForm);

/** "Name, Street, Postcode City, Phone, E-Mail" — the one-line form the legal text receives. */
export const formatDpo = (dpo?: TenantDataProtectionOfficer | null) => {
    if (!dpo || !present(dpo.nameAndLegalForm)) return undefined;
    const place = [present(dpo.postcode), present(dpo.city)].filter(Boolean).join(' ');
    return [dpo.nameAndLegalForm, dpo.street, place, dpo.phoneNumber, dpo.email]
        .map((part) => present(part ?? undefined))
        .filter(Boolean)
        .join(', ');
};
