/**
 * Removes orphaned Ant Design modal layers that sometimes remain after navigation
 * and block all clicks (gray fullscreen mask).
 */
export const clearStuckOverlays = (): void => {
    const masks = document.querySelectorAll('.ant-modal-mask');
    const wraps = document.querySelectorAll('.ant-modal-wrap:not(.ant-modal-wrap-hidden)');

    if (masks.length > 0 && wraps.length === 0) {
        document.querySelectorAll('.ant-modal-root').forEach((root) => root.remove());
    }
};
