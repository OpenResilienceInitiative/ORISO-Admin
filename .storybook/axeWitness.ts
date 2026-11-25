// This reader has no counter mutation API. The Vite plugin instruments the
// installed addon module, and only that module can increment its private count.
export const readInstalledAxeWitness = () => undefined;

export const captureVerificationBrowser = () => ({
    userAgent: navigator.userAgent,
    locale: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewport: [window.innerWidth, window.innerHeight, window.devicePixelRatio],
    ...import.meta.env.ORISO_VERIFICATION_BROWSER,
});
