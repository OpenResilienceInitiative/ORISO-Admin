/**
 * A department's (Fachbereich = agency × topic) stored contact detail overrides
 * (ORISO-Admin#197). Every member is nullable: null = "no override, inherits the
 * Beratungsstelle value". The admin read returns the raw overrides (not resolved values)
 * so the form can render the inheritance affordance.
 */
export interface DepartmentDetails {
    /** Override of the agency-level opening hours; null = inherit. */
    openingHours?: string | null;
    /** Phone extension (Durchwahl) of the department; null = none. */
    phoneExtension?: string | null;
    /** Floor/location detail (Etage/Bereich) inside the building; null = inherit. */
    floorLocation?: string | null;
}
