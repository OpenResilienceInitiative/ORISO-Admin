import { afterEach, describe, expect, it } from 'vite-plus/test';
import { textContrast } from './darkSchemeStory';

const paint = (html: string) => {
    document.body.innerHTML = html;
    return document.getElementById('text') as HTMLElement;
};

describe('textContrast', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('composites a translucent surface over its backdrop instead of skipping it', () => {
        // White text on 90% white over black: the painted surface is near white, so the text is unreadable.
        const text = paint(`
            <div style="background-color: rgb(0, 0, 0)">
                <div style="background-color: rgba(255, 255, 255, 0.9)">
                    <span id="text" style="color: rgb(255, 255, 255)">Text</span>
                </div>
            </div>`);

        expect(textContrast(text)).toBeLessThan(1.5);
    });

    it('looks through fully transparent layers to the opaque surface', () => {
        const text = paint(`
            <div style="background-color: rgb(0, 0, 0)">
                <div style="background-color: transparent">
                    <span id="text" style="color: rgb(255, 255, 255)">Text</span>
                </div>
            </div>`);

        expect(textContrast(text)).toBeCloseTo(21, 0);
    });
});
