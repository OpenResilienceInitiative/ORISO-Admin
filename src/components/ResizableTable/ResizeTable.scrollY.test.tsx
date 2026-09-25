import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ResizeTable } from './index';
import * as measureModule from './measureAdminTableBodyScrollY';

vi.mock('react-resizable', () => ({
    Resizable: ({ children }: { children: unknown }) => children,
}));

describe('ResizeTable sticky scroll.y (#900)', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'ResizeObserver',
            vi.fn(function ResizeObserverStub(this: ResizeObserver) {
                this.observe = vi.fn();
                this.unobserve = vi.fn();
                this.disconnect = vi.fn();
            }),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('applies a measured body height instead of the 280px chrome guess', async () => {
        vi.spyOn(measureModule, 'measureAdminTableBodyScrollY').mockReturnValue(360);

        const { container } = render(
            <ResizeTable
                rowKey="id"
                columns={[{ title: 'Name', dataIndex: 'name', width: 120 }]}
                dataSource={[{ id: 1, name: 'Ada' }]}
                pagination={false}
            />,
        );

        await waitFor(() => {
            const styled = container.querySelector('.ant-table-wrapper') as HTMLElement | null;
            expect(styled).toBeTruthy();
            expect(styled?.style.getPropertyValue('--admin-table-scroll-y')).toBe('360px');
        });

        // antd applies scroll.y as max-height on the body — that is what keeps
        // the header sticky inside the internal scrollport.
        const body = container.querySelector('.ant-table-body') as HTMLElement;
        expect(body.style.maxHeight).toBe('360px');
        expect(measureModule.measureAdminTableBodyScrollY).toHaveBeenCalled();
    });

    it('does not measure when the caller passes an explicit scroll.y', async () => {
        const measure = vi.spyOn(measureModule, 'measureAdminTableBodyScrollY');

        const { container } = render(
            <ResizeTable
                rowKey="id"
                columns={[{ title: 'Name', dataIndex: 'name', width: 120 }]}
                dataSource={[{ id: 1, name: 'Ada' }]}
                pagination={false}
                scroll={{ y: 240 }}
            />,
        );

        await waitFor(() => {
            expect(container.querySelector('.ant-table')).toBeTruthy();
        });

        expect(measure).not.toHaveBeenCalled();
        const styled = container.querySelector('[style*="--admin-table-scroll-y"]') as HTMLElement;
        expect(styled.style.getPropertyValue('--admin-table-scroll-y')).toBe('240px');
    });
});
