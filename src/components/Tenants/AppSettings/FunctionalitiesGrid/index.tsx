import { CardGrid } from '../../../CardGrid';
import { OtherFunctionsSettings } from '../OtherFunctionsSettings';

interface FunctionalitiesGridProps {
    tenantId: string;
    /** The counsellor statistics switch; not offered to a Träger admin on the single domain. */
    hideStatistics?: boolean;
}

/**
 * The Träger "Weitere" tab (ORISO-Admin#1577; route `functionalities` / `app-settings`): one grid for the
 * Träger admin's own settings and for the platform admin editing a Träger, so both levels see the same
 * tile; each level only passes what it hides. Settings of a conversation type live in Funktionszugriff.
 */
export const FunctionalitiesGrid = ({ tenantId, hideStatistics }: FunctionalitiesGridProps) => (
    <CardGrid raster>
        <CardGrid.Item span={3}>
            <OtherFunctionsSettings tenantId={tenantId} hideStatistics={hideStatistics} />
        </CardGrid.Item>
    </CardGrid>
);
