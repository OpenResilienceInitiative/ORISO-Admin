/**
 * The Bausteine a Träger authors in its own voice (ORISO-Admin#601, ADR-018 §2).
 *
 * This list is the Admin half of the platform catalogue. It is deliberately *short*:
 * five entries, not fifteen. Everything else in the Erstantwort is either platform
 * text or **derived** — rendered from configuration — and a derived Baustein is
 * never a text field, because a typed claim about the system can contradict the
 * configuration while a rendered one cannot.
 *
 * What is therefore **absent on purpose** and must stay absent:
 *
 * - the response-deadline *wording* (the number is editable, the sentence is not),
 * - "send us no personal data",
 * - the modality note,
 * - the data-protection links.
 */

export type ErstantwortBausteinKey =
    | 'erstantwortGreeting'
    | 'erstantwortWhoReadsAlong'
    | 'erstantwortEmergencyAddition'
    | 'erstantwortFreeNotice'
    | 'erstantwortClosing';

export interface ErstantwortBausteinDefinition {
    key: ErstantwortBausteinKey;
    labelKey: string;
    helpKey: string;
    /**
     * Whether a Träger may leave it empty. `whoReadsAlong` is mandatory by
     * decision: the Träger is the controller and ORISO the processor, so the
     * platform must not derive a claim about who can read a counselling room.
     */
    mandatory: boolean;
    /** The single escape hatch (ADR-018 §2). Exactly one entry carries this. */
    isFreeNotice?: boolean;
}

export const ERSTANTWORT_BAUSTEINE: ErstantwortBausteinDefinition[] = [
    {
        key: 'erstantwortGreeting',
        labelKey: 'tenants.erstantwort.greeting.label',
        helpKey: 'tenants.erstantwort.greeting.help',
        mandatory: false,
    },
    {
        key: 'erstantwortWhoReadsAlong',
        labelKey: 'tenants.erstantwort.whoReadsAlong.label',
        helpKey: 'tenants.erstantwort.whoReadsAlong.help',
        mandatory: true,
    },
    {
        key: 'erstantwortEmergencyAddition',
        labelKey: 'tenants.erstantwort.emergencyAddition.label',
        helpKey: 'tenants.erstantwort.emergencyAddition.help',
        mandatory: false,
    },
    {
        key: 'erstantwortFreeNotice',
        labelKey: 'tenants.erstantwort.freeNotice.label',
        helpKey: 'tenants.erstantwort.freeNotice.help',
        mandatory: false,
        isFreeNotice: true,
    },
    {
        key: 'erstantwortClosing',
        labelKey: 'tenants.erstantwort.closing.label',
        helpKey: 'tenants.erstantwort.closing.help',
        mandatory: false,
    },
];

/** ADR-018: the platform default Antwortfrist, in working days. */
export const DEFAULT_RESPONSE_DEADLINE_DAYS = 2;

/**
 * The one German variant a Träger writes, from its own `languageFormal`.
 *
 * ADR-018 §8: a Träger is either formal or informal, so it must never be asked to
 * write both — only platform texts carry both axes. Returning a single code rather
 * than a list is what makes that structural instead of a UI convention.
 */
export const germanVariantFor = (languageFormal?: boolean): 'de' | 'de@informal' =>
    languageFormal === false ? 'de@informal' : 'de';
