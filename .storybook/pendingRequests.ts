const nativeFetch = window.fetch.bind(window);
const nativeSetTimeout = window.setTimeout.bind(window);
let pending = 0;

// A story can end while its own requests are still on their way to the worker. Resetting
// the handlers then fails them, and the toast lands in the next story, which did nothing wrong.
window.fetch = (...args) => {
    pending += 1;
    const release = () => {
        pending -= 1;
    };
    const response = nativeFetch(...args);
    response.then(release, release);
    return response;
};

/** Let a finished story's requests settle under its own handlers; a request that never answers is not awaited. */
export const settlePendingRequests = async (timeoutMs = 1_000) => {
    const deadline = Date.now() + timeoutMs;
    do {
        await new Promise((resolve) => {
            nativeSetTimeout(resolve, 0);
        });
    } while (pending > 0 && Date.now() < deadline);
};
