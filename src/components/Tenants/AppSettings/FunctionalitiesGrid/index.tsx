import { CardGrid } from '../../../CardGrid';
import { OtherFunctionsSettings } from '../OtherFunctionsSettings';

interface FunctionalitiesGridProps {
    tenantId: string;
    /** Parts a level does not offer. Every flag defaults to showing the part. */
    hideCalls?: boolean;
    hideStatistics?: boolean;
    hideGroupChatToggle?: boolean;
}

/**
 * The Träger "Funktionalitäten" tab: one grid for the Träger admin's own settings and for the platform
 * admin editing a Träger, so both levels see the same tile; each level only passes what it hides.
 * ORISO-Admin#1577: one full-width tile whose topics are folding sections, as on the conversation-type
 * tiles in Funktionszugriff. The email server has its own tab.
 */
export const FunctionalitiesGrid = ({
    tenantId,
    hideCalls,
    hideStatistics,
    hideGroupChatToggle,
}: FunctionalitiesGridProps) => (
    <CardGrid raster>
        <CardGrid.Item span={3}>
            <OtherFunctionsSettings
                tenantId={tenantId}
                hideCalls={hideCalls}
                hideStatistics={hideStatistics}
                hideGroupChatToggle={hideGroupChatToggle}
            />
        </CardGrid.Item>
    </CardGrid>
);
