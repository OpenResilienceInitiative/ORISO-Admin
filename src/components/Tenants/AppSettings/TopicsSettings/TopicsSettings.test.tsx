import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// vitest has no svgr plugin — stub the icons' ReactComponent exports.
vi.mock('../../../../resources/img/svg/pen.svg', () => ({
    ReactComponent: () => null,
}));
vi.mock('../../../../resources/img/svg/i.svg', () => ({
    ReactComponent: () => null,
}));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'en' },
    }),
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
    it('renders every default topic with ordering, catalogue metadata, and translations', () => {
        render(<TopicsSettings />);

        expect(screen.getAllByRole('listitem')).toHaveLength(DEFAULT_TOPICS.length);
        // Spot checks: primary (non-German UI falls back to English) title and other-language line.
        expect(screen.getByText('1. General social counselling')).toBeInTheDocument();
        expect(screen.getByText(/DE: Allgemeine Sozialberatung/)).toBeInTheDocument();
        expect(screen.getByText(/TR: Genel sosyal danışmanlık/)).toBeInTheDocument();
        expect(screen.getAllByText(/^tenants\.appSettings\.topics\.topicId: \d+$/)).toHaveLength(
            DEFAULT_TOPICS.length,
        );
        expect(screen.getAllByText('tenants.appSettings.topics.displayGroup: Standard Caritas topic catalogue'))
            .toHaveLength(DEFAULT_TOPICS.length);
        expect(screen.getAllByText(/^tenants\.appSettings\.topics\.sortOrder: \d+$/)).toHaveLength(
            DEFAULT_TOPICS.length,
        );
        expect(screen.getAllByText('tenants.appSettings.topics.standardBaseline')).toHaveLength(DEFAULT_TOPICS.length);
    });

    it('shows a read-only state without editing controls and separates catalogue from visibility', () => {
        render(<TopicsSettings />);

        expect(screen.getByText('tenants.appSettings.topics.visibilityNotice')).toBeInTheDocument();
        expect(screen.getAllByText('tenants.appSettings.topics.editingDisabled')).toHaveLength(DEFAULT_TOPICS.length);
        expect(screen.queryByRole('button', { name: 'tenants.appSettings.topics.edit' })).not.toBeInTheDocument();
        expect(screen.queryByText('tenants.appSettings.topics.comingSoon.text')).not.toBeInTheDocument();
    });
});
