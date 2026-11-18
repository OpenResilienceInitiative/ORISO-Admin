import { describe, expect, it } from 'vite-plus/test';
import { renderReadme } from './renderReadme';

const parse = (markdown: string) => {
    const host = document.createElement('div');
    host.innerHTML = renderReadme(markdown);
    return host;
};

describe('renderReadme', () => {
    it('renders headings, lists and https images', () => {
        const html = parse('# Tools\n\n- one\n\n![Screen](https://raw.githubusercontent.com/o/r/main/a.png)');
        expect(html.querySelector('h1')?.textContent).toBe('Tools');
        expect(html.querySelectorAll('li')).toHaveLength(1);
        const image = html.querySelector('img');
        expect(image?.getAttribute('src')).toBe('https://raw.githubusercontent.com/o/r/main/a.png');
        expect(image?.getAttribute('alt')).toBe('Screen');
    });

    it('drops images that are not https and keeps their alt text', () => {
        const html = parse('![Plain](http://example.org/a.png) ![Rel](docs/a.png)');
        expect(html.querySelector('img')).toBeNull();
        expect(html.textContent).toContain('Plain');
    });

    it('shows raw HTML as text instead of rendering it', () => {
        const html = parse('<script>alert(1)</script><img src=x onerror="alert(1)">');
        expect(html.querySelector('script')).toBeNull();
        expect(html.querySelector('img')).toBeNull();
        expect(html.textContent).toContain('<script>');
    });

    it('opens links in a new tab without opener and drops script links', () => {
        const html = parse('[Docs](https://example.org) [Bad](javascript:alert(1))');
        const links = html.querySelectorAll('a');
        expect(links).toHaveLength(1);
        expect(links[0].getAttribute('target')).toBe('_blank');
        expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
    });
});
