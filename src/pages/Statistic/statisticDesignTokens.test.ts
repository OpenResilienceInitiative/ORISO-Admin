import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(__dirname, '../../styles/components/statistic.less'), 'utf8').replace(
    /\/\/.*$/gm,
    '',
);
const page = readFileSync(resolve(__dirname, '../Statistic.tsx'), 'utf8');

const MAX_MOTION_MS = 480;

const rule = (selector: string) => {
    const start = styles.indexOf(`${selector} {`);
    return styles.slice(start, styles.indexOf('\n}', start));
};

/**
 * Admin#1296: the statistics page reads the shared M3 tokens, so it follows the tenant's colours
 * and looks like the rest of Admin. A literal colour here would make it a foreign body again.
 */
describe('statistics page design tokens', () => {
    it('has no literal colour in its stylesheet', () => {
        expect(styles.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) ?? []).toEqual([]);
    });

    it('has no literal colour in the chart series', () => {
        expect(page.match(/color: '#[0-9a-fA-F]{3,8}'/g) ?? []).toEqual([]);
    });

    it('pairs every filled background with its own text colour, so a tenant accent stays readable', () => {
        expect(rule('.statisticDashboard__trend--bad')).toContain('color: var(--m3-on-primary-container)');
        expect(rule('.statisticDashboard__trend--great')).toContain('color: var(--m3-on-secondary)');
        expect(rule('.statisticDashboard__legendItem--active')).toContain('color: var(--m3-on-secondary)');
        expect(rule('.statisticDashboard__legendItem--active')).not.toContain('--m3-primary-fixed');
        expect(rule('.statisticDashboard__cardMenuItem--active:hover')).not.toContain('--m3-primary)');
        expect(rule('.statisticDashboard__barTooltip')).toContain('color: var(--m3-surface)');
        expect(rule('.statisticDashboard__barTooltip')).not.toContain('--m3-on-primary');
    });

    it('keeps every animation and transition short', () => {
        const motion = styles.split('\n').filter((line) => /^\s*(animation|transition)\b/.test(line));
        const tooLong = motion.filter((line) =>
            [...line.matchAll(/(\d+)ms/g)].some((match) => Number(match[1]) > MAX_MOTION_MS),
        );
        expect(tooLong).toEqual([]);
    });

    it('does not zoom the page when the scope changes', () => {
        expect(styles).not.toMatch(/translateY\(8px\) scale/);
    });
});
