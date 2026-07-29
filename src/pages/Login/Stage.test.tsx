import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage from './Stage';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));

const stageLess = readFileSync(resolve(__dirname, '../../styles/components/stage.less'), 'utf8');

/**
 * The dark stage panel of the public surface.
 *
 * #594.14 — it used to fall back to a hardcoded Lottie animation
 * (`resources/animations/admin_panel.json`) whenever no tenant logo was set,
 * which is how a stand-in animation ended up next to an uploaded test asset on
 * the onboarding page. The only artwork it may show is the platform logo
 * configured in Theme settings → Appearance (`theming.logo` on the public
 * tenant data — the source the app layer reads).
 *
 * #594.13a — its surface must be the desktop sidebar's own token, not a local
 * value that merely looks like it.
 */
describe('Stage', () => {
    it('shows the logo configured in Theme settings → Appearance', () => {
        render(<Stage logo="https://cdn.example.org/platform-logo.svg" />);

        expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute(
            'src',
            'https://cdn.example.org/platform-logo.svg',
        );
    });

    it('shows no stand-in artwork when no logo is configured', () => {
        const { container } = render(<Stage />);

        expect(screen.queryByRole('img')).toBeNull();
        expect(container.querySelector('.stage__lottie')).toBeNull();
    });

    it('no longer imports or renders a hardcoded animation asset', () => {
        const source = readFileSync(resolve(__dirname, 'Stage.tsx'), 'utf8');
        const imports = source.match(/^import .*$/gm) ?? [];

        expect(imports.join('\n')).not.toMatch(/animations|LottieAnimation/);
        expect(source).not.toMatch(/<LottieAnimation/);
    });

    it('takes the desktop sidebar token for its surface instead of a local colour', () => {
        expect(stageLess).toMatch(/background-color:\s*var\(--m3-on-background/);
        expect(stageLess).not.toMatch(/background-color:\s*#1f1f1f/);
    });
});
