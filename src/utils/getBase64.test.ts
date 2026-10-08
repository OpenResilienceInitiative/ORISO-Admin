import { afterEach, describe, expect, it, vi } from 'vitest';
import getBase64 from './getBase64';

afterEach(() => vi.restoreAllMocks());

describe('reading uploaded artwork', () => {
    it.each(['error', 'abort'])('reports %s without accepting an unread file', (event) => {
        const loaded = vi.fn();
        const failed = vi.fn();
        vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function failRead() {
            this.dispatchEvent(new Event(event));
        });
        getBase64(new File(['svg'], 'robot.svg'), loaded, failed);
        expect(failed).toHaveBeenCalledOnce();
        expect(loaded).not.toHaveBeenCalled();
    });
});
