import type { StoryObj } from '@storybook/react-vite';
import { PHONE_390 } from '../../components/DpaLegalForm/dpaStoryText';
import { LoginSurface } from './Login';

/**
 * The public sign-in surface (#594.12–#594.17).
 *
 * It is the reference for "one surface language": the dark stage panel takes
 * the desktop sidebar's own `--m3-on-background` token, the page carries the
 * product's single background tone (`--m3-surface-container-high` — the light
 * grey the onboarding completion screen already used), the fields are tonal
 * with it instead of white cut-outs, and the footer menu — Imprint, Privacy and
 * the language entry — sits in the bottom left of the dark panel in white.
 *
 * {@link SideBySide} puts this next to the tenant-admin onboarding page so the
 * shared language is verifiable at a glance rather than by memory.
 */
const meta = {
    title: 'Pages/Login/PublicSurface',
    parameters: { layout: 'fullscreen' },
    render: () => <LoginSurface />,
};

export default meta;

/** Desktop: 40vw dark panel, form column centred in the remaining 60vw. */
export const Desktop: StoryObj = {};

/** 390x844: the stage settles off-canvas, the footer menu returns in flow. */
export const Mobile: StoryObj = {
    parameters: { layout: 'fullscreen', ...PHONE_390.parameters },
    globals: PHONE_390.globals,
};

const COMPARED = [
    { title: 'Login', id: 'pages-login-publicsurface--desktop' },
    { title: 'Tenant-admin onboarding', id: 'pages-tenantonboarding-publicpage--desktop' },
];

/**
 * The acceptance check for #594: login and onboarding side by side, each in a
 * 1512x900 frame scaled to half size. Same panel colour, same page tone, same
 * footer menu, same column centring — if one of them drifts it is visible here
 * without switching stories.
 */
export const SideBySide: StoryObj = {
    parameters: { layout: 'fullscreen' },
    render: () => (
        <div style={{ display: 'flex', gap: 16, padding: 16, alignItems: 'flex-start' }}>
            {COMPARED.map(({ title, id }) => (
                <figure key={id} style={{ margin: 0 }}>
                    <figcaption style={{ font: '600 13px/20px Inter, sans-serif', paddingBottom: 8 }}>
                        {title}
                    </figcaption>
                    <div style={{ width: 756, height: 450, overflow: 'hidden' }}>
                        <iframe
                            title={title}
                            src={`/iframe.html?id=${id}&viewMode=story`}
                            width={1512}
                            height={900}
                            style={{ border: 0, transform: 'scale(0.5)', transformOrigin: 'top left' }}
                        />
                    </div>
                </figure>
            ))}
        </div>
    ),
};
