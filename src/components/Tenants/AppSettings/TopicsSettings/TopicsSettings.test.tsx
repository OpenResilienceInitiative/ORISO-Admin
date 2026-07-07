import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// vitest has no svgr plugin — stub the icons' ReactComponent exports.
vi.mock('../../../../resources/img/svg/pen.svg', () => ({
    ReactComponent: () => null,
}));
vi.mock('../../../../resources/img/svg/i.svg', () => ({
    ReactComponent: () => null,
}));

import { TopicsSettings } from './index';
import { DEFAULT_TOPICS } from './defaultTopics';

// antd's responsive components need matchMedia, which jsdom does not provide.
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

describe('TopicsSettings', () => {
    it('renders every default topic with its translations', () => {
        render(<TopicsSettings />);

        expect(screen.getAllByRole('listitem')).toHaveLength(DEFAULT_TOPICS.length);
        // Spot checks: primary (non-German UI falls back to English) title and other-language line.
        expect(screen.getByText('General social counselling')).toBeInTheDocument();
        expect(screen.getByText(/DE: Allgemeine Sozialberatung/)).toBeInTheDocument();
        expect(screen.getByText(/TR: Genel sosyal danışmanlık/)).toBeInTheDocument();
    });

    it('opens the coming-soon modal from the edit button instead of editing', async () => {
        const user = userEvent.setup();
        render(<TopicsSettings />);

        expect(screen.queryByText('tenants.appSettings.topics.comingSoon.text')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'tenants.appSettings.topics.edit' }));

        expect(await screen.findByText('tenants.appSettings.topics.comingSoon.text')).toBeInTheDocument();
    });
});
