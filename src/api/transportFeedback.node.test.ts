// @vitest-environment node
import { describe, expect, it, vi } from 'vite-plus/test';
import { message } from 'antd';
import { captureTransportFeedback } from './transportFeedback';

vi.mock('antd', () => ({
    message: {
        error: vi.fn(() => {
            throw new Error('No DOM holder');
        }),
    },
}));

describe('transport visual feedback without a window', () => {
    it('does not throw over the original transport failure or invoke a DOM API', () => {
        const report = captureTransportFeedback();
        expect(() => report({ content: 'Original transport failure', duration: 8 })).not.toThrow();
        expect(message.error).not.toHaveBeenCalled();
    });
});
