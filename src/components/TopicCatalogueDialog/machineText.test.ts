import { describe, expect, it } from 'vite-plus/test';
import { machineText } from './machineText';

describe('machineText', () => {
    it('decodes entities instead of showing them', () => {
        expect(machineText('<p>Health &amp; care</p>')).toBe('Health & care');
        expect(machineText('&quot;Pflege&quot; zu Hause')).toBe('"Pflege" zu Hause');
    });

    it('turns tags into spaces and keeps escaped markup as text', () => {
        expect(machineText('<p>Alter</p><p>und Pflege</p>')).toBe('Alter und Pflege');
        expect(machineText('&lt;b&gt;Schulden&lt;/b&gt;')).toBe('<b>Schulden</b>');
    });

    it('gives an empty text for nothing', () => {
        expect(machineText(undefined)).toBe('');
        expect(machineText('<p> &nbsp; </p>')).toBe('');
    });
});
