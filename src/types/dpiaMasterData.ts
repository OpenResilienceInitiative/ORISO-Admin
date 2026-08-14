/**
 * Platform-level DPIA operator master data (ORISO-Admin#735).
 *
 * Mirrors `PlatformDpiaMasterDataDTO` in the TenantService API spec. Every field is
 * typed on purpose — this record is also served unauthenticated to the living-DPIA and
 * legal document renderers, so nothing secret may ever be added to it.
 */

/** Compliance preset the supervisory authority follows. Switches norm citations in the rendered documents. */
export type DpiaLegalFramework = 'KDG' | 'GDPR';

export interface DpiaOperator {
    legalName?: string;
    shortName?: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    /** Name or organisation of the data protection officer. */
    dpoName?: string;
    /** Department responsible for the processing activity. */
    department?: string;
    /** Person responsible for the processing activity. */
    responsiblePerson?: string;
}

export interface DpiaSupervisoryAuthority {
    legalFramework?: DpiaLegalFramework;
    name?: string;
    address?: string;
    email?: string;
}

export interface DpiaDocumentMetadata {
    /** ISO date (YYYY-MM-DD) of the current document version. */
    documentDate?: string;
    /** ISO date (YYYY-MM-DD) the document is due for its next review. */
    nextReviewDate?: string;
}

/** A single reported figure: the count plus the date it was accurate on. */
export interface DpiaKeyFigure {
    count?: number;
    asOfDate?: string;
}

export interface DpiaKeyFigures {
    tenants?: DpiaKeyFigure;
    counsellingCentres?: DpiaKeyFigure;
    activeCounsellors?: DpiaKeyFigure;
    registeredClients?: DpiaKeyFigure;
}

export interface DpiaMasterData {
    operator?: DpiaOperator;
    supervisoryAuthority?: DpiaSupervisoryAuthority;
    document?: DpiaDocumentMetadata;
    keyFigures?: DpiaKeyFigures;
}

/** The four figures the card renders, in display order. */
export const DPIA_KEY_FIGURE_NAMES = [
    'tenants',
    'counsellingCentres',
    'activeCounsellors',
    'registeredClients',
] as const;

export type DpiaKeyFigureName = (typeof DPIA_KEY_FIGURE_NAMES)[number];
