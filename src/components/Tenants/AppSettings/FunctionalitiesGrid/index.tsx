import { CardGrid } from '../../../CardGrid';
import { CommunicationSettings } from '../CommunicationSettings';
import { OtherFunctionsSettings } from '../OtherFunctionsSettings';
import { SmtpSettings } from '../SmtpSettings';

interface FunctionalitiesGridProps {
    tenantId: string;
    /** Tiles a level does not offer. Every flag defaults to showing the tile. */
    hideSmtp?: boolean;
    hideCommunication?: boolean;
    /** Flags of the "Sonstige Funktionen" tile itself. */
    hideTopicsToggle?: boolean;
    hideStatistics?: boolean;
    hideGroupChatToggle?: boolean;
}

/**
 * The tiles of the Träger "Funktionalitäten" tab in the settings raster. One grid for the
 * Träger admin's own settings and for the platform admin editing a Träger, so both levels
 * show the same tiles in the same places; each level only passes what it hides.
 */
export const FunctionalitiesGrid = ({
    tenantId,
    hideSmtp,
    hideCommunication,
    hideTopicsToggle,
    hideStatistics,
    hideGroupChatToggle,
}: FunctionalitiesGridProps) => (
    <CardGrid raster>
        {!hideSmtp && (
            <CardGrid.Item span={3}>
                <SmtpSettings tenantId={tenantId} />
            </CardGrid.Item>
        )}
        {!hideCommunication && (
            <CardGrid.Item>
                <CommunicationSettings tenantId={tenantId} />
            </CardGrid.Item>
        )}
        {/* Two columns wide, so its panels sit side by side instead of in one tall column. */}
        <CardGrid.Item span={2}>
            <OtherFunctionsSettings
                tenantId={tenantId}
                hideTopics={hideTopicsToggle}
                hideStatistics={hideStatistics}
                hideGroupChatToggle={hideGroupChatToggle}
            />
        </CardGrid.Item>
    </CardGrid>
);
