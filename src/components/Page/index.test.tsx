import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Page } from './index';
import { useRegisterCardDeckNav } from '../CardDeck/CardDeckNavContext';

const scrollCards = vi.fn();
const cardNav = {
    controlsId: 'cards',
    canScrollBackward: false,
    canScrollForward: true,
    previousLabel: 'Previous card',
    nextLabel: 'Next card',
    scroll: scrollCards,
};
const CardNav = () => {
    useRegisterCardDeckNav('cards', cardNav);
    return null;
};

vi.mock('../../hooks/useIsDesktopLayout.hook', () => ({ useIsDesktopLayout: () => true }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('antd', () => ({ Spin: () => <span>Loading</span> }));
// Icon rendering is covered by Storybook; avoid loading the entire MUI icon
// catalog while exercising the header's scroll behavior in jsdom.
vi.mock('@mui/icons-material', () => {
    const Icon = () => <svg />;
    return {
        AdminPanelSettingsOutlined: Icon,
        AppsOutlined: Icon,
        BalanceOutlined: Icon,
        CategoryOutlined: Icon,
        ChevronLeft: Icon,
        EmailOutlined: Icon,
        ManageAccountsOutlined: Icon,
        SettingsApplicationsOutlined: Icon,
        SettingsOutlined: Icon,
    };
});

beforeEach(() => {
    scrollCards.mockClear();
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollBy = vi.fn();
});

it('keeps card navigation when tabs fit, but gives overflowing tabs priority', () => {
    const { container } = render(
        <MemoryRouter>
            <Page>
                <Page.Title
                    tabs={[
                        { to: '/one', titleKey: 'One' },
                        { to: '/two', titleKey: 'Two' },
                    ]}
                />
                <CardNav />
            </Page>
        </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
    expect(scrollCards).toHaveBeenCalledWith(1);
    scrollCards.mockClear();
    const row = container.querySelector('[data-admin-page-tabs]') as HTMLElement;
    Object.defineProperty(row, 'clientWidth', { configurable: true, value: 500 });
    Object.defineProperty(row, 'scrollWidth', { configurable: true, value: 1200 });
    fireEvent.resize(window);
    fireEvent.click(screen.getByRole('button', { name: 'page.tabs.next' }));
    expect(scrollCards).not.toHaveBeenCalled();
});

it.each(['title', 'back'])('scrolls overflowing tabs and disables arrows at the edges (%s)', (header) => {
    const tabs = [
        { to: '/global', titleKey: 'Global Configs' },
        { to: '/notices', titleKey: 'System notices' },
    ];
    const { container } = render(
        <MemoryRouter initialEntries={['/global']}>
            <Page>{header === 'title' ? <Page.Title tabs={tabs} /> : <Page.Back path="/" tabs={tabs} />}</Page>
        </MemoryRouter>,
    );
    const row = container.querySelector('[data-admin-page-tabs]') as HTMLElement;
    Object.defineProperty(row, 'clientWidth', { configurable: true, value: 500 });
    Object.defineProperty(row, 'scrollWidth', { configurable: true, value: 1200 });
    fireEvent.resize(window);
    const previous = screen.getByRole('button', { name: 'page.tabs.previous' });
    const next = screen.getByRole('button', { name: 'page.tabs.next' });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
    expect(next).toHaveAttribute('aria-controls', row.id);
    fireEvent.click(next);
    expect(row.scrollBy).toHaveBeenCalledWith({ left: 400, behavior: 'smooth' });
    row.scrollLeft = 700;
    fireEvent.scroll(row);
    expect(next).toBeDisabled();
    expect(previous).toBeEnabled();
    fireEvent.click(previous);
    expect(row.scrollBy).toHaveBeenLastCalledWith({ left: -400, behavior: 'smooth' });
    Object.defineProperty(row, 'scrollWidth', { configurable: true, value: 500 });
    row.scrollLeft = 0;
    fireEvent.resize(window);
    expect(screen.getAllByRole('button').every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
});
