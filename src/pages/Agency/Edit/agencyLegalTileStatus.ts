import type { AgencyContact, AgencyData } from '../../../types/agency';
import type { TenantDataProtectionOfficer } from '../../../types/tenant';
import { isEmptyLegalContent } from '../../../components/Tenants/LegalSettings/utils/legalHelpTexts';
import { hasOwnAgencyDpo } from '../../../utils/dataProtectionOfficer';

/** What a collapsed legal tile says about itself. Texts live in the locale files under these keys. */
export interface LegalTileStatus {
    key: string;
    tone: 'neutral' | 'attention';
}

const REQUIRED_CONTACT_FIELDS: Array<keyof AgencyContact> = ['nameAndLegalForm', 'postcode', 'city', 'phoneNumber'];

const isContactComplete = (contact?: AgencyContact | null) =>
    !!contact && REQUIRED_CONTACT_FIELDS.every((field) => !!contact[field]);

const hasText = (texts?: Record<string, string>) => !isEmptyLegalContent(texts);

const COMPLETE: LegalTileStatus = { key: 'agency.legal.status.complete', tone: 'neutral' };
const MISSING: LegalTileStatus = { key: 'agency.legal.status.missing', tone: 'attention' };

export const responsibleTileStatus = (agencyData?: AgencyData): LegalTileStatus =>
    isContactComplete(agencyData?.dataProtection?.agencyDataProtectionResponsibleContact) ? COMPLETE : MISSING;

export const dataProtectionContactTileStatus = (
    agencyData?: AgencyData,
    traegerDpo?: TenantDataProtectionOfficer | null,
): LegalTileStatus => {
    const dataProtection = agencyData?.dataProtection;
    switch (dataProtection?.dataProtectionResponsibleEntity) {
        case 'AGENCY_RESPONSIBLE':
            return COMPLETE;
        case 'ALTERNATIVE_REPRESENTATIVE':
            return isContactComplete(dataProtection.alternativeDataProtectionRepresentativeContact)
                ? COMPLETE
                : MISSING;
        default:
            if (hasOwnAgencyDpo(dataProtection)) {
                return isContactComplete(dataProtection?.dataProtectionOfficerContact) ? COMPLETE : MISSING;
            }
            return traegerDpo
                ? { key: 'tenants.legal.departmentDataProtection.status.inheritedFromTraeger', tone: 'neutral' }
                : MISSING;
    }
};

export const contractDocumentsTileStatus = (): LegalTileStatus => ({
    key: 'agency.legal.status.managedByTraeger',
    tone: 'neutral',
});

/** Only the agency-wide text counts; a Fachbereich may still hold its own. */
export const imprintTileStatus = (agencyData?: AgencyData): LegalTileStatus =>
    hasText(agencyData?.content?.impressum)
        ? { key: 'legal.status.published', tone: 'neutral' }
        : { key: 'legal.status.empty', tone: 'attention' };

export const privacyTileStatus = (agencyData?: AgencyData): LegalTileStatus =>
    hasText(agencyData?.content?.privacy)
        ? { key: 'legal.status.published', tone: 'neutral' }
        : { key: 'tenants.legal.departmentDataProtection.status.inheritedFromTraeger', tone: 'neutral' };
