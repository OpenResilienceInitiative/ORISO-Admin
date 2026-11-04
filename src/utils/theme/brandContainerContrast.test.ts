import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// ORISO-Admin#1322: on a light Träger brand colour, `--m3-primary` is not
// guaranteed to be readable on `--m3-primary-container`. Brand-tinted content
// on that surface must use the guarded `--admin-accent-on-container` instead
// (or `--m3-on-primary-container` for neutral content).
const SRC = join(__dirname, '..', '..');

const styleFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : styleFiles(path);
        return /\.(s?css)$/.test(entry.name) ? [path] : [];
    });

/** Declarations of one rule body, without its nested rules. */
const ruleBodies = (css: string): string[] => {
    const bodies: string[] = [];
    const stack: string[] = [];
    let current = '';
    Array.from(css.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')).forEach((char) => {
        if (char === '{') {
            stack.push(current);
            current = '';
        } else if (char === '}') {
            bodies.push(current);
            current = stack.pop() ?? '';
        } else {
            current += char;
        }
    });
    return bodies;
};

const onBrandContainer = /background(-color)?\s*:\s*var\(--m3-primary-container\b/;
const brandText = /(^|[;\s])color\s*:\s*var\(--m3-primary\s*[,)]/;

describe('brand-tinted content on the light brand container (#1322)', () => {
    it('never uses the unguarded --m3-primary as text or icon colour there', () => {
        const offenders = styleFiles(SRC).flatMap((file) =>
            ruleBodies(readFileSync(file, 'utf8'))
                .filter((body) => onBrandContainer.test(body) && brandText.test(body))
                .map(() => relative(SRC, file)),
        );

        expect(offenders).toEqual([]);
    });
});
