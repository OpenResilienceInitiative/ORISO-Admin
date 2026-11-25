import type { RefObject } from 'react';
import { listLayoutFor, useMeasuredListLayout, type ListLayout } from '../../../hooks/useMeasuredListLayout';

// Measured on the list container (navigation rail and page gutters already taken), not the
// viewport, in Storybook "Pages/Agency/AgencyList" (2026-11-01) with long names and topics: the
// wide row needs 904px, the topics column (capped at 180px) 212px more. The Träger chip keeps
// 150px so it stays readable. The tablet row fits down to 640px.
const PHONE_BELOW = 640;
const WIDE_BASE = 920;
const WIDE_TENANT = 150;
const WIDE_TOPICS = 220;

export interface AgencyTableColumns {
    tenant: boolean;
    topics: boolean;
}

/** The narrowest container that still holds the wide row with these optional columns. */
export const wideFrom = ({ tenant, topics }: AgencyTableColumns) =>
    WIDE_BASE + (tenant ? WIDE_TENANT : 0) + (topics ? WIDE_TOPICS : 0);

export const agencyTableLayoutFor = (width: number, columns: AgencyTableColumns): ListLayout =>
    listLayoutFor(width, { phoneBelow: PHONE_BELOW, wideFrom: wideFrom(columns) });

export const useAgencyTableLayout = (container: RefObject<HTMLElement | null>, columns: AgencyTableColumns) =>
    useMeasuredListLayout(container, { phoneBelow: PHONE_BELOW, wideFrom: wideFrom(columns) });
