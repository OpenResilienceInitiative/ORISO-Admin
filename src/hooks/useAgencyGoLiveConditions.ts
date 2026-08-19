import { useAgencyHasConsultants } from './useAgencyHasConsultants';
import { useLegalTextVersions } from './useLegalTextVersions.hook';
import { AgencyData } from '../types/agency';

export interface AgencyGoLiveConditions {
    masterDataComplete: boolean;
    departmentsDefined: boolean;
    hasTeam: boolean;
    privacyPublished: boolean;
    imprintPublished: boolean;
    allMet: boolean;
    isLoading: boolean;
}

const hasPublishedContent = (localisedText?: Record<string, string>) =>
    !!localisedText && Object.values(localisedText).some((value) => !!value && value.trim() !== '');

/**
 * The system-checked go-live chain of one Beratungsstelle (concept 2026-08-19):
 * 1. master data filled → 2. departments defined → 3. at least one person →
 * 4. privacy policy published → 5. imprint published. Only then may the
 * visibility switch activate; deactivation is never gated here.
 *
 * Published legal texts are read from the versioned publish flow (ADR-021);
 * pre-versioning agencies fall back to their working-copy content so a legacy
 * Beratungsstelle that is factually published does not read as "open".
 */
export const useAgencyGoLiveConditions = ({ id, agencyData }: { id?: string; agencyData?: AgencyData }) => {
    const agencyId = Number(id);
    const isPersisted = !!id && id !== 'add' && Number.isFinite(agencyId);

    const { data: hasConsultants, isLoading: isLoadingConsultants } = useAgencyHasConsultants({ id });
    const privacyVersions = useLegalTextVersions({ level: 'agency', agencyId, kind: 'DPP' }, isPersisted);
    const imprintVersions = useLegalTextVersions({ level: 'agency', agencyId, kind: 'IMPRINT' }, isPersisted);

    const masterDataComplete = !!(agencyData?.name && agencyData?.postcode && agencyData?.city);
    const departmentsDefined = (agencyData?.topics?.length ?? 0) > 0;
    const hasTeam = hasConsultants === true;
    const privacyPublished =
        (privacyVersions.data?.length ?? 0) > 0 || hasPublishedContent(agencyData?.content?.privacy);
    const imprintPublished =
        (imprintVersions.data?.length ?? 0) > 0 || hasPublishedContent(agencyData?.content?.impressum);

    return {
        masterDataComplete,
        departmentsDefined,
        hasTeam,
        privacyPublished,
        imprintPublished,
        allMet: masterDataComplete && departmentsDefined && hasTeam && privacyPublished && imprintPublished,
        isLoading: isPersisted && (isLoadingConsultants || privacyVersions.isLoading || imprintVersions.isLoading),
    } as AgencyGoLiveConditions;
};
