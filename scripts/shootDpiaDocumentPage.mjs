/**
 * Captures the same German DPIA document fixture at the review viewports.
 *
 * Usage:
 *   node scripts/shootDpiaDocumentPage.mjs [baseUrl] [outDir]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:6006';
const outDir = process.argv[3] ?? 'output/playwright/issue-759';
const storyId = 'dpia-dpiadocumentpage--with-internal-notes';

const viewports = [
    { name: 'with-internal-notes-1440x900', width: 1440, height: 900 },
    { name: 'with-internal-notes-1280x800', width: 1280, height: 800 },
    { name: 'with-internal-notes-390x844', width: 390, height: 844 },
];

const captureGeometry = () => {
    const rectangle = (element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
    };

    return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        document: {
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
        },
        appbar: rectangle(document.querySelector('header')),
        chapterNav: rectangle(document.querySelector('nav')),
        main: rectangle(document.querySelector('main')),
        matrix: rectangle(document.querySelector('[role=region]')),
        sections: [...document.querySelectorAll('main section')].map((section) => ({
            id: section.id,
            rect: rectangle(section),
        })),
    };
};

const run = async () => {
    await mkdir(outDir, { recursive: true });

    const browser = await chromium.launch();
    try {
        for (const viewport of viewports) {
            const page = await browser.newPage({
                viewport: { width: viewport.width, height: viewport.height },
                deviceScaleFactor: 1,
                locale: 'de-DE',
            });

            try {
                await page.addInitScript(() => {
                    localStorage.setItem('oriso-admin.language', 'de');
                    document.cookie = 'oriso-admin.language=de;path=/';
                });
                await page.goto(`${baseUrl}/iframe.html?id=${storyId}&viewMode=story`, {
                    waitUntil: 'domcontentloaded',
                });
                await page.getByText('Datenschutz-Folgenabschätzung', { exact: true }).first().waitFor();

                const geometry = await page.evaluate(captureGeometry);
                await page.screenshot({ path: `${outDir}/${viewport.name}.png`, fullPage: true });
                await writeFile(`${outDir}/${viewport.name}.geometry.json`, `${JSON.stringify(geometry, null, 2)}\n`);

                if (viewport.width === 390) {
                    await page.screenshot({ path: `${outDir}/${viewport.name}-viewport.png` });
                }
            } finally {
                await page.close();
            }
        }
    } finally {
        await browser.close();
    }
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
