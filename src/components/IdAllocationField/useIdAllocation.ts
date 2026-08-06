import { useCallback, useEffect, useRef, useState } from 'react';
import type { IdAllocationClient, IdAllocationState } from '../../api/idAllocation/idAllocation';

export type IdFieldMode = 'auto' | 'manual';

/**
 * Field-level validation state (ORISO-Admin#570):
 * `auto` = no deliberate number choice (backend assigns the smallest free id) ·
 * `empty` = manual mode without a value · `checking` = debounce/request running ·
 * `available` / `reserved` / `assigned` = authoritative backend answer ·
 * `error` = the allocation service could not be reached.
 */
export type IdValidationState = 'auto' | 'empty' | 'checking' | 'available' | 'reserved' | 'assigned' | 'error';

export interface UseIdAllocationOptions {
    client: IdAllocationClient;
    /** Typing pause before the availability check fires. */
    debounceMs?: number;
}

export interface UseIdAllocationResult {
    mode: IdFieldMode;
    /** Manually pinned id; `undefined` in Auto mode and while manual-empty. */
    value?: number;
    validation: IdValidationState;
    /** Auto is always submittable; manual only with a confirmed-free id. */
    canSubmit: boolean;
    stepUpDisabled: boolean;
    stepDownDisabled: boolean;
    /** Deliberate switch to manual mode (typing); `undefined` = cleared field. */
    setManualValue: (value: number | undefined) => void;
    /** Arrow click/key: from Auto adopt the smallest free id, else next free id in that direction. */
    step: (direction: 1 | -1) => void;
    /** The visible Auto toggle: back to no deliberate number choice. */
    resetToAuto: () => void;
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
}: UseIdAllocationOptions): UseIdAllocationResult => {
    const [mode, setMode] = useState<IdFieldMode>('auto');
    const [value, setValue] = useState<number | undefined>();
    const [validation, setValidation] = useState<IdValidationState>('auto');
    const [stepUpDisabled, setStepUpDisabled] = useState(false);
    const [stepDownDisabled, setStepDownDisabled] = useState(false);

    // Monotonic token: any state-changing action bumps it, and async results
    // only apply while their captured token is still the latest — this is the
    // "stale responses discarded" guarantee.
    const requestToken = useRef(0);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const stepInFlight = useRef(false);

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
            if (stepInFlight.current) return;
            stepInFlight.current = true;
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
                    setMode('manual');
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
                    stepInFlight.current = false;
                });
        },
        [client, value],
    );

    const resetToAuto = useCallback(() => {
        cancelPendingCheck();
        stepInFlight.current = false;
        setMode('auto');
        setValue(undefined);
        setValidation('auto');
        setStepUpDisabled(false);
        setStepDownDisabled(false);
    }, []);

    return {
        mode,
        value,
        validation,
        canSubmit: mode === 'auto' || validation === 'available',
        stepUpDisabled,
        stepDownDisabled,
        setManualValue,
        step,
        resetToAuto,
    };
};
