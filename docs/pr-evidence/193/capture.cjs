const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'msedge' });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (e) => console.log(e.message));
    await page.goto('http://localhost:6193/iframe.html?id=organisms-page--overflowing-settings-tabs&viewMode=story', {
        timeout: 120000,
    });
    const row = page.locator('[data-admin-page-tabs]');
    await row.waitFor({ timeout: 120000 });
    const buttons = page.locator('[data-admin-page-deck-nav] button');
    await buttons.last().waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-admin-page-deck-nav] button:last-child').disabled);
    fs.mkdirSync('docs/pr-evidence/193', { recursive: true });
    await page.screenshot({ path: 'docs/pr-evidence/193/tabs-start.png' });
    await buttons.last().click();
    await page.waitForFunction(() => document.querySelector('[data-admin-page-deck-nav] button:last-child').disabled);
    if (await buttons.last().isEnabled()) throw Error('Forward arrow did not reach end');
    const end = await row.evaluate((e) => e.scrollLeft);
    if (end <= 0) throw Error('Tabs did not scroll');
    await page.waitForTimeout(350);
    await page.screenshot({ path: 'docs/pr-evidence/193/tabs-end.png' });
    await buttons.first().focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    if ((await row.evaluate((e) => e.scrollLeft)) >= end) throw Error('Keyboard reverse navigation failed');
    console.log('PASS: forward reaches final tab, end disabled, keyboard reverse works');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    if (await row.count()) throw Error('Desktop tabs displayed on mobile');
    console.log('PASS: desktop tab row absent on mobile');
    await browser.close();
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
