/** Diagnostic observation only. The original console sink and verification gate remain active. */
export const beginFixtureDiagnostic = (selection: 'deadline-warning' | 'registration-warning') => {
    const requested = import.meta.env.VITE_ORISO_FIXTURE_DIAGNOSTIC;
    if (!requested) return () => {};
    if (!['deadline-warning', 'registration-warning'].includes(requested))
        throw new Error('Unknown fixture diagnostic selection');
    if (requested !== selection) return () => {};
    const original = console.error;
    let observed = false;
    let comparison: Record<string, unknown> | undefined;
    const onComparison = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        if (detail.phase === 'enter') comparison = detail.receipt;
        else if (detail.phase === 'exit' && comparison?.comparisonId === detail.comparisonId) comparison = undefined;
    };
    window.addEventListener('oriso-fixture-comparison', onComparison);
    console.info(JSON.stringify({ fixtureDiagnostic: 'begin', selection, freshProcessRequired: true }));
    const observer: typeof console.error = (...args) => {
        if (
            !observed &&
            args.some((value) => typeof value === 'string' && value.includes('There may be circular references'))
        ) {
            observed = true;
            console.info(
                JSON.stringify({
                    fixtureDiagnostic: 'first-warning',
                    selection,
                    comparison,
                    stack: new Error('First circular-reference warning origin').stack?.slice(0, 6000),
                }),
            );
        }
        original(...args);
    };
    console.error = observer;
    return () => {
        window.removeEventListener('oriso-fixture-comparison', onComparison);
        const sinkStillOwned = console.error === observer;
        if (sinkStillOwned) console.error = original;
        console.info(JSON.stringify({ fixtureDiagnostic: 'end', selection, observed, sinkStillOwned }));
        if (!sinkStillOwned) throw new Error('Fixture diagnostic console sink changed before cleanup');
    };
};
