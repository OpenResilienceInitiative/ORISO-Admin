import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const desktopTabs = readFileSync(resolve(__dirname, './AdminSegmentedTabs.module.scss'), 'utf8');
const mobileChips = readFileSync(
    resolve(__dirname, '../M3ConnectedButtonGroup/m3ConnectedButtonGroup.module.scss'),
    'utf8',
);

/**
 * #900: desktop AdminSegmentedTabs and mobile M3ConnectedButtonGroup are the
 * same subsection switcher on two layouts. Tokens are canonical — both must
 * read the same vars so tenant brand colours stay in sync.
 */
describe('subsection switcher colour source (#900)', () => {
    it('uses the same unselected M3 tokens on desktop tabs and mobile chips', () => {
        expect(desktopTabs).toMatch(/background:\s*var\(--m3-secondary-container,\s*#646d78\)/);
        expect(desktopTabs).toMatch(/color:\s*var\(--m3-on-secondary-container,\s*#e7effc\)/);
        expect(mobileChips).toMatch(/background:\s*var\(--m3-secondary-container,\s*#646d78\)/);
        expect(mobileChips).toMatch(/color:\s*var\(--m3-on-secondary-container,\s*#e7effc\)/);
    });

    it('uses the same selected M3 tokens on desktop tabs and mobile chips', () => {
        expect(desktopTabs).toMatch(/background:\s*var\(--m3-secondary,\s*#4c555f\)/);
        expect(desktopTabs).toMatch(/color:\s*var\(--m3-primary-fixed,\s*#ffdad5\)/);
        expect(mobileChips).toMatch(/background:\s*var\(--m3-secondary,\s*#4c555f\)/);
        expect(mobileChips).toMatch(/color:\s*var\(--m3-primary-fixed,\s*#ffdad5\)/);
    });

    it('does not hardcode the former token fallbacks as bare hex on desktop tabs', () => {
        const itemBlock = desktopTabs.slice(desktopTabs.indexOf('.item {'), desktopTabs.indexOf('.itemActive'));
        expect(itemBlock).not.toMatch(/background:\s*#646d78/);
        expect(itemBlock).not.toMatch(/color:\s*#e7effc/);

        const activeBlock = desktopTabs.slice(desktopTabs.indexOf('.itemActive'), desktopTabs.indexOf('.itemDisabled'));
        expect(activeBlock).not.toMatch(/background:\s*#4c555f/);
        expect(activeBlock).not.toMatch(/color:\s*#ffffff/);
    });

    it('keeps a visible focus ring on mobile chips that is not clipped by the scrollport', () => {
        // Nested SCSS (`&:focus-visible`) — assert the compiled source shape.
        expect(mobileChips).toMatch(/&:focus-visible\s*\{[^}]*box-shadow:\s*0 0 0 3px/s);
        expect(mobileChips).toMatch(/padding-block:\s*3px/);
    });
});
