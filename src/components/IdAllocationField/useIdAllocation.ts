import { useCallback, useEffect, useRef, useState } from 'react';
import type { IdAllocationClient, IdAllocationState } from '../../api/idAllocation/idAllocation';

/** `auto` / `manual` create a NEW unit (next free or pinned id); `existing` invites into one. */
export type IdFieldMode = 'auto' | 'manual' | 'existing';

export interface IdUnitOption {
    id: number;
    /** Display name; absent when the unit is only known by its number (e.g. a typed Nr. or the viewer's own id). */
    name?: string;
    /** Agencies only: topics the unit counsels on — searched and shown as a secondary line. */
    topics?: string[];
    /** Agencies only: lets the bar fill an empty Träger field. */
    tenantId?: number;
    tenantName?: string;
    /** Agencies only: the default topic permission for counsellors invited into it. */
    topicPermission?: 'NONE' | 'SELECT_EXISTING' | 'CREATE';
}

/**
 * Field-level validation state (ORISO-Admin#570):
 * `auto` = no deliberate number choice (backend assigns the smallest free id) ·
 * `empty` = manual mode without a value · `checking` = debounce/request running ·
 * `available` / `reserved` / `assigned` = authoritative backend answer ·
 * `error` = the allocation service could not be reached.
 */
export type IdValidationState =
    | 'auto'
    | 'empty'
    | 'checking'
    | 'available'
    | 'reserved'
    | 'assigned'
    | 'error'
    | 'existing';

export interface UseIdAllocationOptions {
    client: IdAllocationClient;
    /** Typing pause before the availability check fires. */
    debounceMs?: number;
    /** Start on an existing unit (prefill or locked viewer scope) instead of Auto. */
    initialUnit?: IdUnitOption;
}

export interface UseIdAllocationResult {
    mode: IdFieldMode;
    /** Manually pinned id or the existing unit's id; `undefined` in Auto mode and while manual-empty. */
    value?: number;
    /** The picked existing unit while `mode === 'existing'`. */
    unit?: IdUnitOption;
    validation: IdValidationState;
    /** Auto is always submittable; manual only with a confirmed-free id. */
    canSubmit: boolean;
    stepUpDisabled: boolean;
    stepDownDisabled: boolean;
    /** Deliberate switch to manual mode (typing); `undefined` = cleared field. */
    setManualValue: (value: number | undefined) => void;
    /** Arrow click/key: from Auto adopt the smallest free id, else next free id in that direction. */
    step: (direction: 1 | -1) => void;
    /** "＋ Neu anlegen": back to no deliberate number choice. */
    resetToAuto: () => void;
    /** Always submittable: an existing unit needs no availability check. */
    selectExisting: (unit: IdUnitOption) => void;
    /** Read-only preview of the id Auto would assign right now (for the "Neu anlegen" entry). */
    peekNextFree: () => Promise<number | null>;
}

const DEFAULT_DEBOUNCE_MS = 300;

const validationForState = (state: IdAllocationState): IdValidationState => {
    if (state === 'FREE') return 'available';
    return state === 'RESERVED' ? 'reserved' : 'assigned';
};

/**
 * State machine behind the invite composer's ID fields: visible Auto default,
 * debounced live validation with stale-response discarding, and free-ID
 * stepping that skips assigned and reserved ids.
 */
export const useIdAllocation = ({
    client,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    initialUnit,
}: UseIdAllocationOptions): UseIdAllocationResult => {
    const [mode, setMode] = useState<IdFieldMode>(initialUnit ? 'existing' : 'auto');
    const [value, setValue] = useState<number | undefined>(initialUnit?.id);
    const [unit, setUnit] = useState<IdUnitOption | undefined>(initialUnit);
    const [validation, setValidation] = useState<IdValidationState>(initialUnit ? 'existing' : 'auto');
    const [stepUpDisabled, setStepUpDisabled] = useState(false);
    const [stepDownDisabled, setStepDownDisabled] = useState(false);

    // Monotonic token: any state-changing action bumps it, and async results
    // only apply while their captured token is still the latest — this is the
    // "stale responses discarded" guarantee.
    const requestToken = useRef(0);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    // Id of the running step; a reset clears it, so a stale step cannot clear a newer one.
    const stepInFlight = useRef<number | null>(null);
    const stepSeq = useRef(0);

    const cancelPendingCheck = () => {
        requestToken.current += 1;
        if (debounceTimer.current !== undefined) {
            clearTimeout(debounceTimer.current);
            debounceTimer.current = undefined;
        }
    };

    useEffect(
        () => () => {
            // Unmount: invalidate in-flight work so late responses cannot set state.
            cancelPendingCheck();
        },
        [],
    );

    const setManualValue = useCallback(
        (nextValue: number | undefined) => {
            cancelPendingCheck();
            setMode('manual');
            setUnit(undefined);
            setValue(nextValue);
            setStepUpDisabled(false);
            setStepDownDisabled(false);

            if (nextValue === undefined) {
                setValidation('empty');
                return;
            }

            setValidation('checking');
            const token = requestToken.current;
            debounceTimer.current = setTimeout(() => {
                client
                    .checkIdAvailability(nextValue)
                    .then((availability) => {
                        if (token !== requestToken.current) return;
                        setValidation(validationForState(availability.state));
                    })
                    .catch(() => {
                        if (token !== requestToken.current) return;
                        setValidation('error');
                    });
            }, debounceMs);
        },
        [client, debounceMs],
    );

    const step = useCallback(
        (direction: 1 | -1) => {
            if (stepInFlight.current !== null) return;
            stepSeq.current += 1;
            const stepId = stepSeq.current;
            stepInFlight.current = stepId;
            cancelPendingCheck();
            const token = requestToken.current;

            // First arrow interaction from Auto (or an empty manual field) adopts
            // the current next free id — the same candidate Auto would assign.
            const fromAuto = value === undefined;
            const params = fromAuto
                ? ({ direction: 'up' } as const)
                : ({ from: value, direction: direction === 1 ? 'up' : 'down' } as const);

            client
                .nextFreeId(params)
                .then(({ id }) => {
                    if (token !== requestToken.current) return;
                    if (id == null) {
                        // No free id in that direction: value unchanged, arrow disabled
                        // until the anchor moves again.
                        if (direction === 1) setStepUpDisabled(true);
                        else setStepDownDisabled(true);
                        return;
                    }
                    // The split button hard-overwrites: an existing pick becomes a new free id.
                    setMode('manual');
                    setUnit(undefined);
                    setValue(id);
                    // The next-free answer is authoritative: the id is free right now.
                    setValidation('available');
                    setStepUpDisabled(false);
                    setStepDownDisabled(false);
                })
                .catch(() => {
                    if (token !== requestToken.current) return;
                    setValidation(fromAuto ? 'auto' : 'error');
                })
                .finally(() => {
                    if (stepInFlight.current === stepId) stepInFlight.current = null;
                });
        },
        [client, value],
    );

    const resetToAuto = useCallback(() => {
        cancelPendingCheck();
        stepInFlight.current = null;
        setMode('auto');
        setValue(undefined);
        setUnit(undefined);
        setValidation('auto');
        setStepUpDisabled(false);
        setStepDownDisabled(false);
    }, []);

    const selectExisting = useCallback((next: IdUnitOption) => {
        cancelPendingCheck();
        stepInFlight.current = null;
        setMode('existing');
        setUnit(next);
        setValue(next.id);
        setValidation('existing');
        setStepUpDisabled(false);
        setStepDownDisabled(false);
    }, []);

    const peekNextFree = useCallback(
        () =>
            Promise.resolve()
                .then(() => client.nextFreeId({ direction: 'up' }))
                .then((answer) => answer?.id ?? null)
                .catch(() => null),
        [client],
    );

    return {
        mode,
        value,
        unit,
        validation,
        canSubmit: mode === 'auto' || validation === 'available' || validation === 'existing',
        stepUpDisabled,
        stepDownDisabled,
        setManualValue,
        step,
        resetToAuto,
        selectExisting,
        peekNextFree,
    };
};
