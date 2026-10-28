/** Diagnostic observation only. The original console sink and verification gate remain active. */
export const beginFixtureDiagnostic = (selection: 'deadline-warning' | 'registration-warning') => {
    const requested = import.meta.env.VITE_ORISO_FIXTURE_DIAGNOSTIC;
    if (!requested) return () => {};
    if (!['deadline-warning', 'registration-warning'].includes(requested))
        throw new Error('Unknown fixture diagnostic selection');
    if (requested !== selection) return () => {};
    const original = console.error;
    let observed = false;
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
                    stack: new Error('First circular-reference warning origin').stack?.slice(0, 6000),
                }),
            );
        }
        original(...args);
    };
    console.error = observer;
    return () => {
        const sinkStillOwned = console.error === observer;
        if (sinkStillOwned) console.error = original;
        console.info(JSON.stringify({ fixtureDiagnostic: 'end', selection, observed, sinkStillOwned }));
        if (!sinkStillOwned) throw new Error('Fixture diagnostic console sink changed before cleanup');
    };
};
