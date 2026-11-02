import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(__dirname, '../../styles/components/statistic.less'), 'utf8').replace(
    /\/\/.*$/gm,
    '',
);
const page = readFileSync(resolve(__dirname, '../Statistic.tsx'), 'utf8');

const MAX_MOTION_MS = 480;

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
