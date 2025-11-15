import { useMemo } from 'react';
import { AgencyContact, AgencyData } from '../types/agency';
import { FeatureFlag } from '../enums/FeatureFlag';
import { useFeatureContext } from '../context/FeatureContext';

export const useAgencyLegalDataMissing = (agencyData: AgencyData) => {
    const { isEnabled } = useFeatureContext();

    return useMemo(() => {
        const isContactComplete = (contact: AgencyContact) => {
            return (
                contact &&
                ['nameAndLegalForm', 'postcode', 'city', 'phoneNumber'].every((field) => {
                    return !!contact?.[field];
                })
            );
        };
        const type = agencyData?.dataProtection?.dataProtectionResponsibleEntity;
        const hasMissingAgencyDataProtectionResponsibleContact = !isContactComplete(
            agencyData?.dataProtection?.agencyDataProtectionResponsibleContact,
        );

        const hasMissingDataProtectionOfficerContact =
            type === 'DATA_PROTECTION_OFFICER' &&
            !isContactComplete(agencyData?.dataProtection?.dataProtectionOfficerContact);

        const hasMissingAlternativeDataProtectionRepresentativeContact =
            type === 'ALTERNATIVE_REPRESENTATIVE' &&
            !isContactComplete(agencyData?.dataProtection?.alternativeDataProtectionRepresentativeContact);

        return (
            isEnabled(FeatureFlag.CentralDataProtectionTemplate) &&
            (hasMissingAgencyDataProtectionResponsibleContact ||
                hasMissingDataProtectionOfficerContact ||
                hasMissingAlternativeDataProtectionRepresentativeContact)
        );
    }, [agencyData]);
};
