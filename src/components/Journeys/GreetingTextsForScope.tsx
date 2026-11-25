import { ErstantwortSettings } from '../Tenants/AppSettings/ErstantwortSettings';
import { AgencyErstantwortSettings } from '../Tenants/AppSettings/ErstantwortSettings/AgencyErstantwort';
import type { ErstantwortContentMap } from '../Tenants/AppSettings/ErstantwortSettings/ErstantwortTextsCard';
import { PlatformGreetingSettings } from '../Tenants/AppSettings/ErstantwortSettings/PlatformGreeting';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { useSingleTenantData } from '../../hooks/useSingleTenantData';
import { useUserPermissions } from '../../hooks/useUserPermission';
import type { JourneyScope } from './useJourneyWorkspace';

/** The centre level, with what it needs of its Träger — as on the Beratungsstelle page. */
const AgencyGreetingTexts = ({ agencyId, tenantId }: { agencyId: string; tenantId?: string }) => {
    const { can } = useUserPermissions();
    const { data: traeger } = useSingleTenantData({ id: tenantId ?? '', retry: false });
    return (
        <AgencyErstantwortSettings
            agencyId={agencyId}
            languageFormal={traeger?.settings?.extendedSettings?.languageFormal}
            activeLanguages={traeger?.settings?.activeLanguages}
            traegerContent={traeger?.content as ErstantwortContentMap | undefined}
            readOnly={!can(PermissionAction.Update, Resource.Agency)}
        />
    );
};

/**
 * The greeting editor of the level the journeys are edited on: platform „Begrüßung", the Träger's
 * or the centre's „Einführung Ratsuchende". Each loads and publishes its own store, as on its page.
 */
export const GreetingTextsForScope = ({ scope }: { scope: JourneyScope }) => {
    const { can } = useUserPermissions();
    if (scope.level === 'platform') return <PlatformGreetingSettings />;
    if (scope.level === 'tenant') {
        return scope.tenantId ? (
            <ErstantwortSettings tenantId={scope.tenantId} readOnly={!can(PermissionAction.Update, Resource.Tenant)} />
        ) : null;
    }
    return scope.agencyId ? <AgencyGreetingTexts agencyId={scope.agencyId} tenantId={scope.tenantId} /> : null;
};
