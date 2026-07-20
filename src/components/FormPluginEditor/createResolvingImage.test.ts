import { afterEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

vi.mock('../../appConfig', () => ({ tenantServiceURL: 'https://api.oriso-dev.site' }));

import { ResolvingImage } from './createResolvingImage';

let editors: Editor[] = [];
const createEditor = (content: string) => {
    const editor = new Editor({
        element: document.createElement('div'),
        extensions: [StarterKit, ResolvingImage],
        content,
    });
    editors.push(editor);
    return editor;
};

afterEach(() => {
    editors.forEach((e) => e.destroy());
    editors = [];
});

describe('ResolvingImage', () => {
    it('displays a resolved /media src in the editing DOM but serializes it relative', () => {
        const editor = createEditor('<p>Impressum</p><img src="/media/abc-1">');

        const renderedImg = editor.view.dom.querySelector('img');
        expect(renderedImg?.getAttribute('src')).toBe('https://api.oriso-dev.site/media/abc-1');

        // getHTML (what gets saved) keeps the origin-independent relative path.
        expect(editor.getHTML()).toContain('src="/media/abc-1"');
        expect(editor.getHTML()).not.toContain('api.oriso-dev.site');
    });

    it('leaves absolute image sources unchanged in both DOM and output', () => {
        const editor = createEditor('<img src="https://cdn/x.png">');
        expect(editor.view.dom.querySelector('img')?.getAttribute('src')).toBe('https://cdn/x.png');
        expect(editor.getHTML()).toContain('src="https://cdn/x.png"');
    });
});
