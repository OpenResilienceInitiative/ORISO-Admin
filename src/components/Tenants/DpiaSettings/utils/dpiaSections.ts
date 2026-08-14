/**
 * The operator-specific free-text slots of the Datenschutz-Folgenabschätzung (DSFA / DPIA).
 *
 * Chapter 6 (technology) is platform-generic and derived from code + ADRs — it is NOT edited
 * here. What an operator must write themselves is the organisational text: governance,
 * accountability, the identity/escalation procedures, the four-stage proportionality test and
 * the closing result paragraph (PLAN-dsfa-living-document-2026-08-13, Docs#80).
 *
 * This list is the single source of truth for the chapter switcher, the mock persistence layer
 * and the i18n keys. Adding a slot = one entry here plus its two i18n keys.
 */
export interface DpiaSection {
    /** Stable storage key — also the persistence map key. Never renumber; the text follows the id. */
    id: string;
    /** Chapter number as printed in the DSFA document, e.g. "8.11". */
    chapter: string;
    /** i18n key of the short title shown in the split button + dropdown. */
    titleKey: string;
    /** i18n key of the help text shown under the editor header. */
    helpKey: string;
    /**
     * Groups the four proportionality stages under one dropdown heading, so the menu shows
     * eight top-level entries even though chapter 9 holds four separate texts.
     */
    group?: 'proportionality';
}

/** Dropdown heading for the chapter 9 stages. */
export const PROPORTIONALITY_GROUP_KEY = 'dpia.sections.group.proportionality';

export const DPIA_SECTIONS: DpiaSection[] = [
    {
        id: 'governance',
        chapter: '4',
        titleKey: 'dpia.sections.governance.title',
        helpKey: 'dpia.sections.governance.help',
    },
    {
        id: 'accountability',
        chapter: '5',
        titleKey: 'dpia.sections.accountability.title',
        helpKey: 'dpia.sections.accountability.help',
    },
    {
        id: 'identityCheck',
        chapter: '8.1',
        titleKey: 'dpia.sections.identityCheck.title',
        helpKey: 'dpia.sections.identityCheck.help',
    },
    {
        id: 'informationChannels',
        chapter: '8.3',
        titleKey: 'dpia.sections.informationChannels.title',
        helpKey: 'dpia.sections.informationChannels.help',
    },
    {
        id: 'escalationChain',
        chapter: '8.11',
        titleKey: 'dpia.sections.escalationChain.title',
        helpKey: 'dpia.sections.escalationChain.help',
    },
    // Chapter 9 is the four-stage proportionality test (Vier-Stufen-Prüfung); each stage is
    // argued separately, so each gets its own text rather than one long free-form block.
    {
        id: 'proportionalityPurpose',
        chapter: '9.1',
        titleKey: 'dpia.sections.proportionalityPurpose.title',
        helpKey: 'dpia.sections.proportionalityPurpose.help',
        group: 'proportionality',
    },
    {
        id: 'proportionalitySuitability',
        chapter: '9.2',
        titleKey: 'dpia.sections.proportionalitySuitability.title',
        helpKey: 'dpia.sections.proportionalitySuitability.help',
        group: 'proportionality',
    },
    {
        id: 'proportionalityNecessity',
        chapter: '9.3',
        titleKey: 'dpia.sections.proportionalityNecessity.title',
        helpKey: 'dpia.sections.proportionalityNecessity.help',
        group: 'proportionality',
    },
    {
        id: 'proportionalityBalance',
        chapter: '9.4',
        titleKey: 'dpia.sections.proportionalityBalance.title',
        helpKey: 'dpia.sections.proportionalityBalance.help',
        group: 'proportionality',
    },
    {
        id: 'resultParagraph',
        chapter: '2',
        titleKey: 'dpia.sections.resultParagraph.title',
        helpKey: 'dpia.sections.resultParagraph.help',
    },
    {
        id: 'annexIndex',
        chapter: 'A',
        titleKey: 'dpia.sections.annexIndex.title',
        helpKey: 'dpia.sections.annexIndex.help',
    },
];

/** The slot the editor opens on. */
export const DEFAULT_DPIA_SECTION_ID = DPIA_SECTIONS[0].id;

export const findDpiaSection = (id: string): DpiaSection | undefined =>
    DPIA_SECTIONS.find((section) => section.id === id);

/** Content keyed by section id; a missing key simply means "not written yet". */
export type DpiaTextMap = Record<string, string>;
