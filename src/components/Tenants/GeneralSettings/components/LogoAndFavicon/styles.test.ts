import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const brandingStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');
const brandingSource = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');
const uploaderProps = [...brandingSource.matchAll(/<FormFileUploaderField([\s\S]*?)\/>/g)].map(([, props]) => props);
const uploaderFor = (field: string) => uploaderProps.find((props) => props.includes(`name={['theming', '${field}']}`));

describe('LogoAndFavicon preview size contract', () => {
    it('shows the 32 × 32 favicon at exactly 32px, so a blurry or cut-off icon is noticed', () => {
        const faviconRule = brandingStyles.match(/\.faviconPreview img\s*{([^}]*)}/s)?.[1] ?? '';

        expect(faviconRule).toMatch(/width:\s*32px/);
        expect(faviconRule).toMatch(/height:\s*32px/);
        expect(uploaderFor('favicon')).toContain('previewClassName: styles.faviconPreview');
    });

    it('does not apply the favicon size to the 512 × 512 logos', () => {
        expect(uploaderFor('logo')).not.toContain('styles.faviconPreview');
        expect(uploaderFor('associationLogo')).not.toContain('styles.faviconPreview');
    });
});
