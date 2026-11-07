import { Fragment, type ReactNode } from 'react';
import { CardGrid } from '../../../CardGrid';
import { CommunicationSettings } from '../CommunicationSettings';
import { OtherFunctionsSettings } from '../OtherFunctionsSettings';
import { SmtpSettings } from '../SmtpSettings';
import { TopicsSettings } from '../TopicsSettings';

interface FunctionalitiesGridProps {
    tenantId: string;
    /** Tiles a level does not offer. Every flag defaults to showing the tile. */
    hideSmtp?: boolean;
    hideCommunication?: boolean;
    hideTopicsCard?: boolean;
    /** Flags of the "Sonstige Funktionen" tile itself. */
    hideTopicsToggle?: boolean;
    hideStatistics?: boolean;
    hideGroupChatToggle?: boolean;
}

/** The tiles of the "Funktionalitäten" tab, top to bottom. Moving a tile is moving its name. */
export const FUNCTIONALITIES_TILE_ORDER = ['smtp', 'communication', 'otherFunctions', 'topics'] as const;

/**
 * The tiles of the Träger "Funktionalitäten" tab in the settings raster. One grid for the
 * Träger admin's own settings and for the platform admin editing a Träger, so both levels
 * show the same tiles in the same places; each level only passes what it hides.
 */
export const FunctionalitiesGrid = ({
    tenantId,
    hideSmtp,
    hideCommunication,
    hideTopicsCard,
    hideTopicsToggle,
    hideStatistics,
    hideGroupChatToggle,
}: FunctionalitiesGridProps) => {
    const tiles: Record<(typeof FUNCTIONALITIES_TILE_ORDER)[number], ReactNode> = {
        smtp: !hideSmtp && (
            <CardGrid.Item span={3}>
                <SmtpSettings tenantId={tenantId} />
            </CardGrid.Item>
        ),
        communication: !hideCommunication && (
            <CardGrid.Item>
                <CommunicationSettings tenantId={tenantId} />
            </CardGrid.Item>
        ),
        // Two columns wide, so its panels sit side by side instead of in one tall column.
        otherFunctions: (
            <CardGrid.Item span={2}>
                <OtherFunctionsSettings
                    tenantId={tenantId}
                    hideTopics={hideTopicsToggle}
                    hideStatistics={hideStatistics}
                    hideGroupChatToggle={hideGroupChatToggle}
                />
            </CardGrid.Item>
        ),
        // A long list: a row of its own, so it does not stretch the tiles beside it.
        topics: !hideTopicsCard && (
            <CardGrid.Item span={3}>
                <TopicsSettings />
            </CardGrid.Item>
        ),
    };

    return (
        <CardGrid raster>
            {FUNCTIONALITIES_TILE_ORDER.map((tile) => (
                <Fragment key={tile}>{tiles[tile]}</Fragment>
            ))}
        </CardGrid>
    );
};
