/** Phase observation only; ordinary story behavior and assertions remain unchanged. */
export const markTokenDiagnostic = (
    phase: string,
    context?: { primaryColor: string; scheme: string; locale: string },
) => {
    const selection = import.meta.env.VITE_ORISO_TOKEN_DIAGNOSTIC;
    if (!selection) return;
    if (!['token-blue-alone', 'token-blue-transition'].includes(selection))
        throw new Error('Unknown token diagnostic selection');
    console.info(JSON.stringify({ tokenDiagnostic: 'phase', selection, phase, context, at: performance.now() }));
};
