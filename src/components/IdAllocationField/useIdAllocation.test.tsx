import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IdAllocationClient, IdAllocationState, NextFreeIdParams } from '../../api/idAllocation/idAllocation';
import { useIdAllocation } from './useIdAllocation';

/**
 * Worked example from ORISO-Admin#570: ids 1–20 and 30–35 are taken. Auto
 * yields 21, stepping up runs 22…29 and then jumps to 36, stepping down from
 * 36 lands on 29, typing 30 is an error.
 */
const TAKEN = new Set<number>([...Array.from({ length: 20 }, (_, i) => i + 1), 30, 31, 32, 33, 34, 35]);

const stateOf = (id: number): IdAllocationState => {
    if (!TAKEN.has(id)) return 'FREE';
    return id >= 30 && id <= 35 ? 'RESERVED' : 'ASSIGNED';
};

const nextFreeFromExample = ({ from, direction }: NextFreeIdParams): number | null => {
    let candidate = from == null ? 1 : from + (direction === 'up' ? 1 : -1);
    while (candidate >= 1 && candidate <= 100) {
        if (!TAKEN.has(candidate)) return candidate;
        candidate += direction === 'up' ? 1 : -1;
    }
    return null;
};

const createClient = (): IdAllocationClient => ({
    checkIdAvailability: vi.fn(async (id: number) => ({ id, state: stateOf(id) })),
    nextFreeId: vi.fn(async (params: NextFreeIdParams) => ({ id: nextFreeFromExample(params) })),
    reserveId: vi.fn(async ({ id }) => ({ id: id ?? 21 })),
    releaseId: vi.fn(async () => {}),
});

const flushPromises = async () => {
    await act(async () => {
        await Promise.resolve();
    });
};

const advance = async (ms: number) => {
    await act(async () => {
        vi.advanceTimersByTime(ms);
    });
    await flushPromises();
};

describe('useIdAllocation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts in Auto mode without any value and is submittable', () => {
        const client = createClient();
        const { result } = renderHook(() => useIdAllocation({ client }));

        expect(result.current.mode).toBe('auto');
        expect(result.current.value).toBeUndefined();
        expect(result.current.canSubmit).toBe(true);
        expect(client.checkIdAvailability).not.toHaveBeenCalled();
    });

    it('adopts the current next free id (21) on the first arrow click from Auto', async () => {
        const client = createClient();
        const { result } = renderHook(() => useIdAllocation({ client }));

        act(() => result.current.step(1));
        await flushPromises();

        expect(client.nextFreeId).toHaveBeenCalledWith({ direction: 'up' });
        expect(result.current.mode).toBe('manual');
        expect(result.current.value).toBe(21);
        expect(result.current.validation).toBe('available');
    });

    it('steps up 22…29, jumps to 36 and comes back down to 29 (skipping taken ids)', async () => {
        const client = createClient();
        const { result } = renderHook(() => useIdAllocation({ client }));

        act(() => result.current.step(1));
        await flushPromises();

        const expectedRun = [22, 23, 24, 25, 26, 27, 28, 29];
        let index = 0;
        while (index < expectedRun.length) {
            act(() => result.current.step(1));
            // eslint-disable-next-line no-await-in-loop -- stepping is inherently sequential
            await flushPromises();
            expect(result.current.value).toBe(expectedRun[index]);
            index += 1;
        }

        act(() => result.current.step(1));
        await flushPromises();
        expect(result.current.value).toBe(36);

        act(() => result.current.step(-1));
        await flushPromises();
        expect(result.current.value).toBe(29);
    });

    it('keeps the value and disables the arrow when no free id exists in that direction', async () => {
        const client = createClient();
        const { result } = renderHook(() => useIdAllocation({ client }));

        act(() => result.current.step(1));
        await flushPromises();
        expect(result.current.value).toBe(21);

        // 1–20 are taken and ids end at 1 downwards: no free id below 21.
        act(() => result.current.step(-1));
        await flushPromises();

        expect(result.current.value).toBe(21);
        expect(result.current.stepDownDisabled).toBe(true);
        expect(result.current.stepUpDisabled).toBe(false);

        // Stepping up re-enables the exhausted direction (the anchor moved).
        act(() => result.current.step(1));
        await flushPromises();
        expect(result.current.value).toBe(22);
        expect(result.current.stepDownDisabled).toBe(false);
    });

    it('uses the queried up direction when stepping from an empty manual field fails', async () => {
        const client = createClient();
        (client.nextFreeId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: null });
        const { result } = renderHook(() => useIdAllocation({ client }));

        act(() => result.current.setManualValue(undefined));
        act(() => result.current.step(-1));
        await flushPromises();

        expect(client.nextFreeId).toHaveBeenCalledWith({ direction: 'up' });
        expect(result.current.stepUpDisabled).toBe(true);
        expect(result.current.stepDownDisabled).toBe(false);
    });

    it('keeps manual-empty visibly invalid when next-free lookup rejects', async () => {
        const client = createClient();
        (client.nextFreeId as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'));
        const { result } = renderHook(() => useIdAllocation({ client }));

        act(() => result.current.setManualValue(undefined));
        act(() => result.current.step(1));
        await flushPromises();

        expect(result.current.mode).toBe('manual');
        expect(result.current.validation).toBe('error');
    });

    it('ignores further step requests while one is in flight', async () => {
        const client = createClient();
        let resolveNextFree: (value: { id: number | null }) => void = () => {};
        (client.nextFreeId as ReturnType<typeof vi.fn>).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveNextFree = resolve;
                }),
        );
        const { result } = renderHook(() => useIdAllocation({ client }));

        act(() => result.current.step(1));
        act(() => result.current.step(1));
        expect(client.nextFreeId).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveNextFree({ id: 21 });
            await Promise.resolve();
        });
        expect(result.current.value).toBe(21);
    });

    it('debounces manual typing by ~300 ms before checking availability', async () => {
        const client = createClient();
        const { result } = renderHook(() => useIdAllocation({ client }));

        act(() => result.current.setManualValue(2));
        expect(result.current.mode).toBe('manual');
        expect(result.current.validation).toBe('checking');
        expect(result.current.canSubmit).toBe(false);

        await advance(200);
        expect(client.checkIdAvailability).not.toHaveBeenCalled();

        act(() => result.current.setManualValue(21));
        await advance(200);
        expect(client.checkIdAvailability).not.toHaveBeenCalled();

        await advance(100);
        expect(client.checkIdAvailability).toHaveBeenCalledTimes(1);
        expect(client.checkIdAvailability).toHaveBeenCalledWith(21);
        expect(result.current.validation).toBe('available');
        expect(result.current.canSubmit).toBe(true);
    });

    it('blocks sending for assigned and reserved ids (typing 30 shows the reserved state)', async () => {
        const client = createClient();
        const { result } = renderHook(() => useIdAllocation({ client }));

        act(() => result.current.setManualValue(30));
        await advance(300);
        expect(result.current.validation).toBe('reserved');
        expect(result.current.canSubmit).toBe(false);

        act(() => result.current.setManualValue(5));
        await advance(300);
        expect(result.current.validation).toBe('assigned');
        expect(result.current.canSubmit).toBe(false);
    });

    it('shows the service-error state when the availability check fails', async () => {
        const client = createClient();
        (client.checkIdAvailability as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'));
        const { result } = renderHook(() => useIdAllocation({ client }));

        act(() => result.current.setManualValue(21));
        await advance(300);

        expect(result.current.validation).toBe('error');
        expect(result.current.canSubmit).toBe(false);
    });

    it('discards stale availability responses (latest request wins)', async () => {
        const client = createClient();
        const pending: Array<(state: IdAllocationState) => void> = [];
        (client.checkIdAvailability as ReturnType<typeof vi.fn>).mockImplementation(
            (id: number) =>
                new Promise((resolve) => {
                    pending.push((state) => resolve({ id, state }));
                }),
        );
        const { result } = renderHook(() => useIdAllocation({ client }));

        act(() => result.current.setManualValue(5));
        await advance(300);
        act(() => result.current.setManualValue(21));
        await advance(300);
        expect(pending).toHaveLength(2);

        // The newer request resolves first …
        await act(async () => {
            pending[1]('FREE');
            await Promise.resolve();
        });
        expect(result.current.validation).toBe('available');

        // … and the stale response for the old value must NOT overwrite it.
        await act(async () => {
            pending[0]('ASSIGNED');
            await Promise.resolve();
        });
        expect(result.current.validation).toBe('available');
    });

    it('treats a cleared field as manual-empty and blocks sending', async () => {
        const client = createClient();
        const { result } = renderHook(() => useIdAllocation({ client }));

        act(() => result.current.setManualValue(21));
        await advance(300);
        act(() => result.current.setManualValue(undefined));

        expect(result.current.mode).toBe('manual');
        expect(result.current.validation).toBe('empty');
        expect(result.current.canSubmit).toBe(false);
        expect(client.checkIdAvailability).toHaveBeenCalledTimes(1);
    });

    it('resets to Auto: no value, submittable, arrows re-enabled, pending checks discarded', async () => {
        const client = createClient();
        const pending: Array<(state: IdAllocationState) => void> = [];
        (client.checkIdAvailability as ReturnType<typeof vi.fn>).mockImplementation(
            (id: number) =>
                new Promise((resolve) => {
                    pending.push((state) => resolve({ id, state }));
                }),
        );
        const { result } = renderHook(() => useIdAllocation({ client }));

        act(() => result.current.setManualValue(30));
        await advance(300);
        act(() => result.current.resetToAuto());

        expect(result.current.mode).toBe('auto');
        expect(result.current.value).toBeUndefined();
        expect(result.current.canSubmit).toBe(true);

        // A response arriving after the reset must not flip the field back to an error state.
        await act(async () => {
            pending[0]?.('ASSIGNED');
            await Promise.resolve();
        });
        expect(result.current.validation).toBe('auto');
        expect(result.current.canSubmit).toBe(true);
    });

    it('ignores a pending next-free response after unmount', async () => {
        const client = createClient();
        let resolveNextFree: (value: { id: number | null }) => void = () => {};
        (client.nextFreeId as ReturnType<typeof vi.fn>).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveNextFree = resolve;
                }),
        );
        const { result, unmount } = renderHook(() => useIdAllocation({ client }));

        act(() => result.current.step(1));
        unmount();
        await act(async () => {
            resolveNextFree({ id: 21 });
            await Promise.resolve();
        });

        expect(client.nextFreeId).toHaveBeenCalledTimes(1);
    });

    it('reserves a confirmed manual id and releases it after a failed submit', async () => {
        const client = createClient();
        const { result } = renderHook(() => useIdAllocation({ client }));

        act(() => result.current.setManualValue(21));
        await advance(300);
        await act(() => result.current.reserveForSubmit());
        expect(client.reserveId).toHaveBeenCalledWith({ allocationMode: 'MANUAL', id: 21 });

        await act(() => result.current.releaseReservation());
        expect(client.releaseId).toHaveBeenCalledWith(21);
    });
});
