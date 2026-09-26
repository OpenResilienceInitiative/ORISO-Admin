/** Reproducible local component proof. Uses isolated browser contexts and closes all of them. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://localhost:6158';
const output = path.resolve(process.argv[3] || 'test-results/dpia-document');
const source = JSON.parse(
    await readFile(new URL('../src/components/Dpia/__fixtures__/dsfa-source.json', import.meta.url), 'utf8'),
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = {
    environment: 'local-dev Storybook; synthetic data; no deployment or live readback',
    baseUrl,
    viewports: [],
    dialogs: [],
};
const normalize = (text) => text.replace(/\s+/g, ' ').trim();

try {
    for (const [width, height] of [
        [1440, 900],
        [1280, 900],
        [820, 1180],
        [390, 844],
    ]) {
        const context = await browser.newContext({ viewport: { width, height }, locale: 'de-DE' });
        const page = await context.newPage();
        try {
            await page.goto(`${baseUrl}/iframe.html?id=dpia-dpiadocumentpage--desktop&viewMode=story`);
            await page.locator('#kap11').waitFor();
            await page.evaluate(() => document.fonts.ready);
            const capture = (name) => page.screenshot({ path: path.join(output, `${width}-${name}.png`) });
            const geometry = () =>
                page.evaluate(() => ({
                    viewport: innerWidth,
                    document: document.documentElement.scrollWidth,
                    tables: [...document.querySelectorAll('[role="region"][tabindex="0"]')].map((element) => ({
                        label:
                            element.getAttribute('aria-label') ||
                            document.getElementById(element.getAttribute('aria-labelledby'))?.textContent,
                        width: element.clientWidth,
                        scroll: element.scrollWidth,
                        left: element.getBoundingClientRect().left,
                        right: element.getBoundingClientRect().right,
                        overflow: getComputedStyle(element).overflowX,
                    })),
                }));
            const checkGeometry = async (stage) => {
                const result = await geometry();
                assert(result.document <= width, `${width} ${stage}: page overflow ${result.document}`);
                result.tables.forEach((table) => {
                    assert(table.label, 'Every table scroll region must be named');
                    assert(table.left >= 0 && table.right <= width, `${width}: escaped table container`);
                    assert.equal(table.overflow, 'auto');
                });
                return result;
            };
            const initial = await checkGeometry('reading');
            await capture('top');
            const navTargets = await page
                .getByRole('navigation', { name: 'Kapitel' })
                .getByRole('link')
                .evaluateAll((links) => links.map((link) => link.hash));
            assert.equal(navTargets.length, 11);
            for (const target of navTargets) assert.equal(await page.locator(target).count(), 1);
            await page.getByRole('button', { name: 'Interne Anmerkungen' }).click();
            await page.locator('#kap2 summary').click();
            await checkGeometry('notes and threshold expanded');
            assert.equal(await page.locator('[data-evidence-key]').count(), 19);
            const preset = page.getByRole('radiogroup', { name: 'Compliance-Preset', exact: true });
            await preset.getByRole('radio', { name: 'DSGVO' }).click();
            assert.equal(await page.locator('#kap8 strong').first().innerText(), 'DSGVO');
            await page
                .getByRole('radiogroup', { name: 'Compliance-Preset (Kapitel 8)' })
                .getByRole('radio', { name: 'KDG' })
                .click();
            assert.equal(await preset.getByRole('radio', { name: 'KDG' }).getAttribute('aria-checked'), 'true');

            if (width === 1440 || width === 390) {
                const keys = width === 1440 ? Object.keys(source.evidence) : ['e2ee-enforced'];
                for (const key of keys) {
                    const trigger = page.locator(`[data-evidence-key="${key}"]`);
                    await trigger.click();
                    const dialog = page.getByRole('dialog');
                    await dialog.waitFor({ state: 'visible' });
                    await page.waitForFunction(() =>
                        document.querySelector('[role="dialog"]')?.contains(document.activeElement),
                    );
                    const record = source.evidence[key];
                    const displayed = await dialog.locator('dd').allTextContents();
                    assert.deepEqual(
                        displayed.map(normalize),
                        [record.who, record.when, record.what, ...(record.src ? [record.src] : [])].map(normalize),
                    );
                    const links = await dialog.getByRole('link').evaluateAll((nodes) =>
                        nodes.map((node) => ({
                            label: node.textContent,
                            href: node.getAttribute('href'),
                            target: node.target,
                            rel: node.rel,
                        })),
                    );
                    assert.deepEqual(
                        links.map(({ label, href }) => ({ label, href })),
                        record.links,
                    );
                    links.forEach((link) => {
                        assert.equal(link.target, '_blank');
                        assert.equal(link.rel, 'noopener noreferrer');
                        assert.match(link.href, /^https:\/\//);
                    });
                    for (const location of source.code[key] || []) {
                        const content = await dialog.innerText();
                        assert(content.includes(location.path));
                        assert(content.includes(`Zeilen ${location.from}–${location.to}`));
                    }
                    const box = await dialog.boundingBox();
                    assert(
                        box.y >= -1 && box.y + box.height <= height + 1,
                        `Dialog escapes ${width}x${height}: ${JSON.stringify(box)}`,
                    );
                    // Cover all visible enabled controls plus the wrap in both directions.
                    const focusableCount = await dialog
                        .locator('a[href], button, input, select, textarea, [tabindex]')
                        .evaluateAll(
                            (elements) =>
                                elements.filter(
                                    (element) =>
                                        element.tabIndex >= 0 &&
                                        !element.matches(':disabled') &&
                                        element.getClientRects().length > 0,
                                ).length,
                        );
                    for (const direction of ['Tab', 'Shift+Tab']) {
                        for (let transition = 0; transition <= focusableCount; transition += 1) {
                            await page.keyboard.press(direction);
                            assert(
                                await dialog.evaluate((element) => element.contains(document.activeElement)),
                                `${width} ${key}: ${direction} escaped dialog at transition ${transition + 1}/${
                                    focusableCount + 1
                                }`,
                            );
                        }
                    }
                    if (width === 390) await capture('evidence');
                    await page.keyboard.press('Escape');
                    await dialog.waitFor({ state: 'hidden' });
                    await page.waitForFunction(
                        (key) => document.querySelector(`[data-evidence-key="${key}"]`) === document.activeElement,
                        key,
                    );
                    report.dialogs.push({
                        width,
                        key,
                        fields: 'exact',
                        links: links.length,
                        keyboard: 'PASS',
                        focusableCount,
                        transitionsPerDirection: focusableCount + 1,
                    });
                }
            }
            for (const chapter of width === 390 ? [1, 7, 10] : width === 1440 ? [2, 10] : [1]) {
                await page.locator(`#kap${chapter}`).evaluate((element) => element.scrollIntoView({ block: 'start' }));
                await capture(`chapter${chapter}`);
            }
            if (width === 390) {
                const table = page.getByRole('region', { name: 'Kapitel 10: Risiken und Maßnahmen' });
                await table.focus();
                await page.keyboard.press('ArrowRight');
                await page.waitForFunction(() => document.querySelector('#kap10 [tabindex="0"]').scrollLeft > 0);
                await table.evaluate((element) => {
                    element.scrollLeft = element.scrollWidth;
                });
                await capture('chapter10-scrolled');
                assert((await geometry()).document <= width);
            }
            report.viewports.push({ width, height, initial, result: 'PASS' });
        } finally {
            await context.close();
        }
    }
    await writeFile(path.join(output, 'verification.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
} finally {
    await browser.close();
}
