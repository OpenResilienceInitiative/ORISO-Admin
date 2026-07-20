import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductTourTooltip } from './ProductTourTooltip';

const translations: Record<string, string> = {
    't.title': 'Mandanten verwalten',
    't.content': 'Hier verwalten Sie <br /> Ihre Mandanten.',
    'productTour.next': 'Weiter',
    'productTour.back': 'Zurück',
    'productTour.done': 'Fertig',
    'productTour.step': 'Schritt',
    'productTour.of': 'von',
    'productTour.close': 'Tour schließen',
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => translations[key] ?? key,
        i18n: { language: 'de', resolvedLanguage: 'de' },
    }),
}));

const baseProps = (over: Record<string, any> = {}) => ({
    index: 1,
    size: 4,
    isLastStep: false,
    continuous: true,
    step: {
        title: 't.title',
        content: 't.content',
    },
    backProps: { onClick: vi.fn(), 'aria-label': 'back' },
    closeProps: { onClick: vi.fn(), 'aria-label': 'close' },
    primaryProps: { onClick: vi.fn(), 'aria-label': 'primary' },
    skipProps: { onClick: vi.fn(), 'aria-label': 'skip' },
    tooltipProps: { 'aria-modal': true },
    controls: {
        next: vi.fn(),
        prev: vi.fn(),
        skip: vi.fn(),
        close: vi.fn(),
    },
    ...over,
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('ProductTourTooltip (admin)', () => {
    it('renders translated title and html content as a dialog', () => {
        render(<ProductTourTooltip {...(baseProps() as any)} />);

        expect(screen.getByRole('alertdialog')).toBeTruthy();
        expect(screen.getByText('Mandanten verwalten')).toBeTruthy();
        expect(screen.getByText(/Ihre Mandanten/, { exact: false })).toBeTruthy();
    });

    it('shows step progress and bullets', () => {
        render(<ProductTourTooltip {...(baseProps() as any)} />);

        expect(screen.getByText('Schritt 2 von 4')).toBeTruthy();
        expect(screen.getByRole('alertdialog').querySelectorAll('.productTourTooltip__bullet')).toHaveLength(4);
    });

    it('hides the back button on the first step and shows done on the last', () => {
        const { unmount } = render(<ProductTourTooltip {...(baseProps({ index: 0 }) as any)} />);
        expect(screen.queryByText('Zurück')).toBeNull();
        unmount();

        render(<ProductTourTooltip {...(baseProps({ index: 3, isLastStep: true }) as any)} />);
        expect(screen.getByText('Fertig')).toBeTruthy();
        expect(screen.queryByText('Weiter')).toBeNull();
    });

    it('strips scriptable markup from translated content', () => {
        translations['t.evil'] =
            'Sicher<br /><script>window.hacked = true;</script><img src=x onerror="window.hacked=true" />';
        render(
            <ProductTourTooltip
                {...(baseProps({
                    step: { title: 't.title', content: 't.evil' },
                }) as any)}
            />,
        );

        const content = document.querySelector('.productTourTooltip__content')!;
        expect(content.innerHTML).not.toContain('<script');
        expect(content.innerHTML).not.toContain('onerror');
        expect(content.innerHTML).toContain('<br');
        expect((window as any).hacked).toBeUndefined();
    });

    it('wires next, back and close to the joyride tour controls', () => {
        const props = baseProps();
        render(<ProductTourTooltip {...(props as any)} />);

        fireEvent.click(screen.getByText('Weiter'));
        fireEvent.click(screen.getByText('Zurück'));
        fireEvent.click(screen.getByLabelText('Tour schließen'));

        expect(props.controls.next).toHaveBeenCalled();
        expect(props.controls.prev).toHaveBeenCalled();
        expect(props.controls.skip).toHaveBeenCalled();
    });
});
