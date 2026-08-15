import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

/* The rich-text editor drags in Tiptap, ProseMirror and an image-upload hook. None
   of that is what this card is about — the card is about which Bausteine exist,
   which German variant is asked for, and how the deadline behaves. Stub it to a
   plain textarea so the assertions are about the card. */
vi.mock('../../../../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({ title, value, onChange, contentLanguage }: any) => (
        <div data-testid={`editor-${title}`} data-content-language={contentLanguage}>
            <label htmlFor={`ed-${title}`}>{title}</label>
            <textarea id={`ed-${title}`} value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} />
        </div>
    ),
}));

// eslint-disable-next-line import/first
import { ErstantwortTextsCard } from './index';

afterEach(cleanup);

/* MUI's AccordionSummary is the toggle. Query it by aria-expanded rather than by
   role+{expanded}, which testing-library only accepts as a boolean. */
const sections = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLElement>('[aria-expanded]'));

const renderCard = (props: Partial<React.ComponentProps<typeof ErstantwortTextsCard>> = {}) =>
    render(
        <ErstantwortTextsCard
            contentByBaustein={{}}
            responseDeadlineDays={undefined}
            languageFormal
            onChange={() => undefined}
            onDeadlineChange={() => undefined}
            {...props}
        />,
    );

describe('ErstantwortTextsCard', () => {
    it('offers one section per Träger-authored Baustein and no more', () => {
        const { container } = renderCard();

        expect(sections(container)).toHaveLength(5);
    });

    it('mounts only the open editor, so the card is not five stacked decks', () => {
        /* Measured before this changed: five always-mounted rich-text decks made
           the page 3,436px tall, so a Träger admin had to scroll past four
           editors to reach the fifth. One at a time keeps it navigable and makes
           "which Baustein am I editing" obvious. */
        renderCard();

        expect(screen.getAllByRole('textbox')).toHaveLength(1);
    });

    it('opens the first Baustein by default so the card is never empty', () => {
        const { container } = renderCard();

        expect(sections(container)[0].getAttribute('aria-expanded')).toBe('true');
    });

    it('switches which editor is mounted when another section is opened', () => {
        const { container } = renderCard();

        fireEvent.click(sections(container)[2]);

        expect(screen.getAllByRole('textbox')).toHaveLength(1);
        expect(screen.getByTestId('editor-tenants.erstantwort.emergencyAddition.label')).toBeTruthy();
    });

    it('asks a formal Träger for the "Sie" variant only', () => {
        /* ADR-018 §8: a Träger is either formal or informal and must never be asked
		   to write both — only platform texts carry both axes. */
        const { container } = renderCard({ languageFormal: true });

        const langs = Array.from(container.querySelectorAll('[data-content-language]')).map((n) =>
            n.getAttribute('data-content-language'),
        );
        expect(new Set(langs)).toEqual(new Set(['de']));
    });

    it('asks an informal Träger for the "Du" variant only', () => {
        const { container } = renderCard({ languageFormal: false });

        const langs = Array.from(container.querySelectorAll('[data-content-language]')).map((n) =>
            n.getAttribute('data-content-language'),
        );
        expect(new Set(langs)).toEqual(new Set(['de@informal']));
    });

    it('reports an edit under its Baustein key and the tenant German variant', () => {
        const onChange = vi.fn();
        renderCard({ onChange, languageFormal: false });

        fireEvent.change(screen.getByRole('textbox'), { target: { value: '<p>Moin.</p>' } });

        expect(onChange).toHaveBeenCalledWith('erstantwortGreeting', 'de@informal', '<p>Moin.</p>');
    });

    it('shows the platform default as a placeholder rather than pre-filling it', () => {
        /* Pre-filling would make a Träger that never authored anything
		   indistinguishable from one that typed the platform words — and would
		   freeze today's wording into the row. */
        renderCard();

        const deadline = screen.getByRole('spinbutton');
        expect(deadline).toHaveValue(null);
        expect(deadline.getAttribute('placeholder')).toBe('2');
    });

    it('accepts a chosen deadline and reports it as a number', () => {
        const onDeadlineChange = vi.fn();
        renderCard({ onDeadlineChange });

        fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } });

        expect(onDeadlineChange).toHaveBeenCalledWith(5);
    });

    it('reports a cleared deadline as absent, not as zero', () => {
        /* Absent means "fall back to the platform default"; 0 would be a promise of
		   a reply within no working days at all. */
        const onDeadlineChange = vi.fn();
        renderCard({ onDeadlineChange, responseDeadlineDays: 5 });

        fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } });

        expect(onDeadlineChange).toHaveBeenCalledWith(undefined);
    });

    it('offers no toggle for the safety Bausteine', () => {
        /* ADR-018 §6: "send us no personal data" and the emergency numbers carry no
		   toggle at all — the deliberate interim substitute for the postponed
		   platform/Träger permission model. */
        renderCard();

        expect(screen.queryAllByRole('switch')).toHaveLength(0);
        expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('marks who-reads-along as the one mandatory Baustein', () => {
        const { container } = renderCard();

        fireEvent.click(sections(container)[1]);

        expect(screen.getByText('tenants.erstantwort.whoReadsAlong.mandatory')).toBeTruthy();
    });

    it('renders existing content for the tenant variant', () => {
        renderCard({
            languageFormal: true,
            contentByBaustein: { erstantwortGreeting: { de: '<p>Hallo.</p>', 'de@informal': '<p>Moin.</p>' } },
        });

        expect(screen.getByRole('textbox')).toHaveValue('<p>Hallo.</p>');
    });
});
