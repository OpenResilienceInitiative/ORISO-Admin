import { afterEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_MOBILE_NAV_SELECTOR, measureAdminTableBodyScrollY } from './measureAdminTableBodyScrollY';

const stubRect = (el: Element, rect: Partial<DOMRect>) => {
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
        toJSON: () => ({}),
        ...rect,
    } as DOMRect);
};

describe('measureAdminTableBodyScrollY (#900)', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('subtracts the fixed mobile nav so body height fits the leftover viewport', () => {
        vi.stubGlobal('innerHeight', 844);

        const root = document.createElement('div');
        const header = document.createElement('div');
        header.className = 'ant-table-header';
        const pagination = document.createElement('div');
        pagination.className = 'ant-table-pagination';
        root.append(header, pagination);
        document.body.appendChild(root);

        const nav = document.createElement('div');
        nav.setAttribute('data-admin-mobile-nav', '');
        document.body.appendChild(nav);

        // Table starts below top chrome; nav is a ~168px fixed bottom bar.
        stubRect(root, { top: 120 });
        stubRect(header, { height: 48 });
        stubRect(pagination, { height: 64 });
        stubRect(nav, { top: 676, bottom: 844 });

        // 844 - 120 - 168 - 48 - 64 - 24 = 420
        expect(measureAdminTableBodyScrollY(root)).toBe(420);
        expect(document.querySelector(ADMIN_MOBILE_NAV_SELECTOR)).toBe(nav);
    });

    it('ignores a nav that is not pinned to the viewport bottom (desktop)', () => {
        vi.stubGlobal('innerHeight', 900);

        const root = document.createElement('div');
        const header = document.createElement('div');
        header.className = 'ant-table-thead';
        root.appendChild(header);
        document.body.appendChild(root);

        const nav = document.createElement('div');
        nav.setAttribute('data-admin-mobile-nav', '');
        document.body.appendChild(nav);

        stubRect(root, { top: 200 });
        stubRect(header, { height: 55 });
        // Mid-page element — must not count as bottom chrome.
        stubRect(nav, { top: 400, bottom: 500 });

        // 900 - 200 - 0 - 55 - 0 - 24 = 621
        expect(measureAdminTableBodyScrollY(root)).toBe(621);
    });

    it('never returns below the minimum body floor', () => {
        vi.stubGlobal('innerHeight', 200);

        const root = document.createElement('div');
        document.body.appendChild(root);
        stubRect(root, { top: 180 });

        expect(measureAdminTableBodyScrollY(root)).toBe(120);
    });
});
