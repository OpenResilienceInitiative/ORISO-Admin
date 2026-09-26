// Guards the emotion setting in ./setup.ts. antd scans every <style> in <head> on each
// component mount, so one tag per MUI rule made big antd+MUI forms time out on CI.
import Box from '@mui/material/Box';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('MUI styles in jsdom', () => {
    it('packs many rules into a few <style> tags', () => {
        render(
            <>
                {Array.from({ length: 50 }, (_, index) => (
                    <Box key={index} sx={{ marginTop: `${index + 1}px` }} />
                ))}
            </>,
        );

        expect(document.head.querySelectorAll('style[data-emotion]').length).toBeLessThanOrEqual(2);
    });

    it('still applies those rules to getComputedStyle', () => {
        render(<Box data-testid="css-hidden" sx={{ display: 'none' }} />);

        expect(screen.getByTestId('css-hidden')).not.toBeVisible();
    });
});
