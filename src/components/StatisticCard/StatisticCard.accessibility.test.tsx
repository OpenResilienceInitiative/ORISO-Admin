import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { StatisticCard } from './StatisticCard';
import type { StatisticCardDefinition } from '../../pages/Statistic/types';

vi.mock('../../pages/Statistic/useAnimatedDisplayValue', () => ({
    useAnimatedDisplayValue: (value: string) => value,
}));

const translate = (key: string, options?: Record<string, unknown>) => String(options?.defaultValue ?? key);
const card: StatisticCardDefinition = {
    key: 'requests',
    title: 'Anfragen',
    value: 'Keine Daten',
    emptyHint: 'wird noch nicht erfasst',
    icon: () => <svg aria-hidden="true" />,
    size: 'small',
};

describe('StatisticCard accessible values', () => {
    it('keeps the empty value readable without naming a generic strong element', async () => {
        const { container } = render(<StatisticCard card={card} locale="de-DE" translate={translate} />);
        const result = await axe.run(container, { runOnly: ['aria-prohibited-attr'] });
        expect(result.violations).toHaveLength(0);
        expect(screen.getByText('Keine Daten')).not.toHaveAttribute('aria-hidden', 'true');
    });

    it.each([
        ['red', 'Abnahme'],
        ['blue', 'Zunahme'],
    ] as const)(
        'reads the %s trend direction without relying on colour or unsupported ARIA',
        async (tone, direction) => {
            const { container } = render(
                <StatisticCard
                    card={{ ...card, emptyHint: undefined, value: '42', trend: { value: '20%', tone } }}
                    locale="de-DE"
                    translate={translate}
                />,
            );
            const result = await axe.run(container, { runOnly: ['aria-prohibited-attr'] });
            expect(result.violations).toHaveLength(0);
            expect(screen.getByText(direction)).not.toHaveAttribute('aria-hidden', 'true');
        },
    );
});
