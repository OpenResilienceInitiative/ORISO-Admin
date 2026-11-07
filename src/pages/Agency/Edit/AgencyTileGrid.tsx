import type { ReactNode } from 'react';
import classNames from 'classnames';
import { CardGrid } from '../../../components/CardGrid';
import { CollapsibleTile } from '../../../components/CollapsibleTile';
import styles from './AgencyTileGrid.module.scss';

export interface AgencyTileSummary {
    icon: ReactNode;
    title: string;
    /** Short state shown in the header of a collapsible tile. */
    status?: string;
    statusTone?: 'neutral' | 'attention';
}

export interface AgencyTile {
    /** Names the tile in the order list and in reviews; never shown. */
    id: string;
    /** Columns the tile takes in the raster. Default 1. */
    span?: 1 | 2 | 3;
    /** A document editor: the tile lets it use the whole row instead of the 800px card. */
    document?: boolean;
    /** What the header of a collapsible tile shows. Without it the tile never collapses. */
    summary?: AgencyTileSummary;
    node: ReactNode;
}

export type AgencyTileLayout = 'raster' | 'collapsible';

/**
 * One page of the Beratungsstelle as a settings raster, exactly like the Träger tabs. The page
 * keeps its tiles in one list; the list order is the order on screen.
 *
 * `collapsible` stacks the tiles that have a `summary` full-width, each folded up to its header;
 * the first one starts open.
 */
export const AgencyTileGrid = ({ tiles, layout = 'raster' }: { tiles: AgencyTile[]; layout?: AgencyTileLayout }) => {
    if (layout === 'collapsible') {
        return (
            <CardGrid raster fillers={false}>
                {tiles.map(({ id, summary, document, node }, index) => (
                    <CardGrid.Item key={id} span={3}>
                        {summary ? (
                            <CollapsibleTile {...summary} defaultOpen={index === 0}>
                                {/* A form stays form-wide; only a document uses the whole row. */}
                                <div className={document ? styles.collapsedDocument : styles.collapsedForm}>{node}</div>
                            </CollapsibleTile>
                        ) : (
                            node
                        )}
                    </CardGrid.Item>
                ))}
            </CardGrid>
        );
    }

    return (
        <CardGrid raster>
            {tiles.map(({ id, span, document, node }) => (
                <CardGrid.Item key={id} span={span} className={classNames({ [styles.documentTile]: document })}>
                    {node}
                </CardGrid.Item>
            ))}
        </CardGrid>
    );
};
