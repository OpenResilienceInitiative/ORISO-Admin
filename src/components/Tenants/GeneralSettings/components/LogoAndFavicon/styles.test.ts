import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const brandingStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');
const brandingSource = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');

describe('LogoAndFavicon preview size contract', () => {
    it('renders the 32x32 favicon preview at exactly 32px in every desktop height', () => {
        const faviconRule = brandingStyles.match(/\.faviconUploader\s*{([^}]*)}/s)?.[1] ?? '';

        expect(faviconRule).toMatch(/width:\s*32px/);
        expect(brandingStyles).not.toMatch(
            /@media only screen and \(min-height:\s*1000px\)[\s\S]*?\.faviconUploader\s*{/,
        );
    });

    it('does not apply the favicon dimensions to the optional 512x512 association logo', () => {
        const uploaderProps = [...brandingSource.matchAll(/<FormFileUploaderField([\s\S]*?)\/>/g)].map(
            ([, props]) => props,
        );
        const associationLogoUploader = uploaderProps.find((props) =>
            props.includes("name={['theming', 'associationLogo']}"),
        );

        expect(associationLogoUploader).toContain('styles.associationLogoUploader');
        expect(associationLogoUploader).not.toContain('styles.faviconUploader');
        expect(brandingStyles).toMatch(/\.associationLogoUploader\s*{[\s\S]*?width:\s*54px/);
        expect(brandingStyles).toMatch(
            /@media only screen and \(min-height:\s*1000px\)[\s\S]*?\.associationLogoUploader\s*{\s*width:\s*64px/,
        );
    });
});
