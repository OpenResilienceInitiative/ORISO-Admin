import { resolve } from 'node:path';
import { compile } from 'sass';
import { describe, expect, it } from 'vitest';

// Compile the shared Sass mixin: phone media rules and container-stacked boards
// must both receive the filter presentation from merged PR1129.
const { css } = compile(resolve(__dirname, './inviteProgressBoard.module.scss'));
const phoneBlock = css.match(/@media \(max-width: 767px\)\s*\{([\s\S]*)\}/)?.[1] ?? '';

describe('InviteProgressBoard stacked filter fold (#1127)', () => {
    it('shows the toggle for phone and container-stacked cards, with a hidden wide default', () => {
        expect(css).toMatch(/\.filterToggle\s*\{[^{}]*display:\s*none/);
        expect(phoneBlock).toMatch(/\.filterToggle\s*\{[^{}]*display:\s*inline-flex/);
        expect(css).toMatch(/\.boardStacked \.filterToggle\s*\{[^{}]*display:\s*inline-flex/);
    });

    it('keeps only the selected chip visible while folded in both stacked variants', () => {
        const folded =
            /\.chips\[data-collapsed=["']?true["']?\] \.chip:not\(\.chipSelected\)\s*\{[^{}]*display:\s*none/;
        expect(phoneBlock).toMatch(folded);
        expect(css).toMatch(
            /\.boardStacked \.chips\[data-collapsed=["']?true["']?\] \.chip:not\(\.chipSelected\)\s*\{[^{}]*display:\s*none/,
        );
    });
});
