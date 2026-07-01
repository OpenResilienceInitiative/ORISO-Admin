import { afterEach, describe, expect, it } from 'vitest';
import { clearStuckOverlays } from './clearStuckOverlays';

afterEach(() => {
    document.body.innerHTML = '';
});

describe('clearStuckOverlays', () => {
    it('removes orphaned modal roots (mask present, no visible wrap)', () => {
        document.body.innerHTML = `
            <div class="ant-modal-root">
                <div class="ant-modal-mask"></div>
                <div class="ant-modal-wrap ant-modal-wrap-hidden"></div>
            </div>`;

        clearStuckOverlays();

        expect(document.querySelectorAll('.ant-modal-root')).toHaveLength(0);
    });

    it('keeps modals that still have a visible wrap', () => {
        document.body.innerHTML = `
            <div class="ant-modal-root">
                <div class="ant-modal-mask"></div>
                <div class="ant-modal-wrap"></div>
            </div>`;

        clearStuckOverlays();

        expect(document.querySelectorAll('.ant-modal-root')).toHaveLength(1);
    });

    it('does nothing when there are no masks', () => {
        document.body.innerHTML = '<div class="content"></div>';
        expect(() => clearStuckOverlays()).not.toThrow();
        expect(document.querySelector('.content')).not.toBeNull();
    });
});
