import { CardGrid } from '../../../CardGrid';
import { OtherFunctionsSettings } from '../OtherFunctionsSettings';
import { TraegerLicenceSenderSettings } from '../TraegerLicenceSenderSettings';

interface FunctionalitiesGridProps {
    tenantId: string;
    /** The counsellor statistics switch; not offered to a Träger admin on the single domain. */
    hideStatistics?: boolean;
    /**
     * The Träger page (`/admin/tenants/:id`): licence and sender block of the Träger, moved here from
     * Stammdaten (Frank, 2026-11-20). The Träger admin's own settings keep the sender in their own
     * Träger information and have no licence to edit.
     */
    withLicenceAndSender?: boolean;
}

/**
 * The Träger "Weitere" tab (ORISO-Admin#1577; route `functionalities` / `app-settings`): one grid for the
 * Träger admin's own settings and for the platform admin editing a Träger, so both levels see the same
 * tile; each level only passes what it hides. Settings of a conversation type live in Funktionszugriff.
 */
export const FunctionalitiesGrid = ({ tenantId, hideStatistics, withLicenceAndSender }: FunctionalitiesGridProps) => (
    <CardGrid raster>
        <CardGrid.Item span={3}>
            <OtherFunctionsSettings tenantId={tenantId} hideStatistics={hideStatistics} />
        </CardGrid.Item>
        {withLicenceAndSender && (
            <CardGrid.Item span={3}>
                <TraegerLicenceSenderSettings tenantId={tenantId} />
            </CardGrid.Item>
        )}
    </CardGrid>
);
