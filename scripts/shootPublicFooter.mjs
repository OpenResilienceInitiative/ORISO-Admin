/**
 * Evidence shots for the public-footer / legal-dialog review fixes.
 *
 * Runs against the Storybook dev server of THIS worktree and writes one PNG per
 * review item, so each fix can be checked against the annotated screenshot it
 * came from instead of "trust me, it works".
 *
 *   node scripts/shootPublicFooter.mjs [baseUrl] [outDir]
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from '/Users/frankgerhardt/ORISO/ORISO-E2E/node_modules/playwright/index.mjs';

const BASE = process.argv[2] ?? 'http://localhost:6103';
const OUT = process.argv[3] ?? 'evidence';

const story = (id) => `${BASE}/iframe.html?id=${id}&viewMode=story`;

const SHOTS = [
    {
        name: '01-footer-one-row-1280',
        id: 'pages-login-publicsurface--desktop',
        viewport: { width: 1280, height: 800 },
        clip: { x: 0, y: 620, width: 640, height: 180 },
    },
    {
        name: '02-footer-one-row-1512',
        id: 'pages-login-publicsurface--desktop',
        viewport: { width: 1512, height: 900 },
        clip: { x: 0, y: 700, width: 760, height: 200 },
    },
    {
        name: '03-language-menu-centred-desktop',
        id: 'pages-login-publicsurface--desktop',
        viewport: { width: 1280, height: 800 },
        openLanguage: true,
        clip: { x: 0, y: 560, width: 640, height: 240 },
    },
    {
        name: '04-language-menu-centred-mobile',
        id: 'pages-login-publicsurface--mobile',
        viewport: { width: 390, height: 844 },
        openLanguage: true,
    },
    {
        name: '05-legal-dialog-imprint',
        id: 'organisms-legalnoticedialog--imprint',
        viewport: { width: 1280, height: 800 },
    },
    {
        name: '06-legal-dialog-privacy',
        id: 'organisms-legalnoticedialog--privacy',
        viewport: { width: 1280, height: 800 },
    },
    {
        name: '07-legal-dialog-mobile',
        id: 'organisms-legalnoticedialog--privacy-on-phone',
        viewport: { width: 390, height: 844 },
    },
    {
        name: '08-legal-dialog-long-text',
        id: 'organisms-legalnoticedialog--long-published-text',
        viewport: { width: 1280, height: 800 },
    },
    {
        name: '09-legal-dialog-long-text-mobile',
        id: 'organisms-legalnoticedialog--long-published-text-on-phone',
        viewport: { width: 390, height: 844 },
    },
];

const run = async () => {
    await mkdir(OUT, { recursive: true });
    const browser = await chromium.launch();

    for (const shot of SHOTS) {
        /* German is the worst case for the footer row — "IMPRESSUM DATENSCHUTZ"
           is ~25% wider than "IMPRINT PRIVACY" — and it is the locale the
           review screenshots were taken in. Pin it instead of inheriting the
           headless browser's default. */
        const page = await browser.newPage({
            viewport: shot.viewport,
            deviceScaleFactor: 2,
            locale: 'de-DE',
        });
        await page.addInitScript(() => {
            globalThis.localStorage.setItem('oriso-admin.language', 'de');
            document.cookie = 'oriso-admin.language=de;path=/';
        });
        /* Storybook's dev server keeps an HMR socket open, so `networkidle`
           never fires — wait for the rendered story instead. */
        await page.goto(story(shot.id), { waitUntil: 'domcontentloaded' });
        await page.waitForSelector(shot.waitFor ?? '.layoutFooter, .ant-modal');
        /* The stage panel slides in over ~2s before it settles at 40vw. */
        await page.waitForTimeout(2600);

        if (shot.openLanguage) {
            await page.getByRole('button', { name: /Anwendungssprache|Select application language/ }).click();
            await page.waitForTimeout(600);
        }

        await page.screenshot({ path: `${OUT}/${shot.name}.png`, clip: shot.clip });
        console.log(`wrote ${OUT}/${shot.name}.png`);
        await page.close();
    }

    await browser.close();
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
