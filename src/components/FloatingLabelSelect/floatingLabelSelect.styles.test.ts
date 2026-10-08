import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './floatingLabelSelect.module.scss'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
);

/*
 * ORISO-Admin#1127 — iOS Safari zooms the page when it focuses an input whose
 * computed font-size is below 16px. antd paints the single-select search input
 * (the element that takes focus) at 14px with a 4-class selector, so a plain
 * `.select .ant-select-selection-search-input { font-size: 16px }` (2 classes)
 * silently loses and tapping a select zoomed the page in.
 */
describe('FloatingLabelSelect focus input size (#1127)', () => {
    // antd: `.ant-select-single:not(.ant-select-customize-input) .ant-select-selector .ant-select-selection-search-input`
    const ANTD_SINGLE_SPECIFICITY = 4;

    const searchInputRules = [...source.matchAll(/([^{}]*ant-select-selection-search-input[^{}]*)\{([^{}]*)\}/g)].map(
        ([, selector, body]) => ({ selector: selector.trim(), body }),
    );

    it('sets 16px on the single-select search input with a selector antd cannot out-rank', () => {
        const rule = searchInputRules.find(
            ({ selector, body }) =>
                /font-size:\s*16px/.test(body) &&
                !selector.includes(',') &&
                selector.includes('ant-select-selector') &&
                selector.includes('ant-select-single'),
        );
        expect(rule, 'no dedicated 16px rule for the single-select search input').toBeDefined();

        // `&` stands for `.select` (one class); every `.ant-…` inside :global(...) adds one more.
        const classes = (rule?.selector.match(/\.[a-z]/g) ?? []).length + (rule?.selector.includes('&') ? 1 : 0);
        expect(classes).toBeGreaterThan(ANTD_SINGLE_SPECIFICITY);
    });
});
