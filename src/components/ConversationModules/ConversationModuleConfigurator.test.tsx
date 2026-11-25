import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { prototypeFor } from './conversationModule';
import { CARITAS_PLATFORM_DEFAULT } from './registrationQuestionnaire';
import { ConversationModuleConfigurator } from './ConversationModuleConfigurator';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock('../Tenants/LegalSettings/components/LegalContentLanguageSelect', () => ({
    LegalContentLanguageSelect: () => null,
}));

vi.mock('../FormPluginEditor/M3RichTextEditor', () => ({
    M3RichTextEditor: ({ title, value, onChange }: any) => (
        <textarea aria-label={title} value={value} onChange={(event) => onChange(event.target.value)} />
    ),
}));

afterEach(cleanup);

const renderConfigurator = (props: Partial<Parameters<typeof ConversationModuleConfigurator>[0]> = {}) => {
    const onSave = vi.fn();
    const prototype = prototypeFor('AGENCY_COUNSELLING');
    render(
        <ConversationModuleConfigurator
            open
            module={prototype}
            prototype={prototypeFor('AGENCY_COUNSELLING')}
            onSave={onSave}
            onClose={() => undefined}
            {...props}
        />,
    );
    return { onSave };
};

const rowOf = (prototypeId: string) => screen.getByTestId(`module-section-${prototypeId}`);
const saveButton = () => screen.getByRole('button', { name: 'conversationModules.dialog.save' });

describe('ConversationModuleConfigurator', () => {
    it('lists the greeting sections of the prototype in order', () => {
        renderConfigurator();
        const list = screen.getByRole('list', { name: 'conversationModules.field.greeting' });
        const ids = within(list)
            .getAllByRole('listitem')
            .map((item) => item.getAttribute('data-testid'));
        expect(ids[0]).toBe('module-section-greeting');
        expect(ids).toContain('module-section-emergencyNumbers');
    });

    it('moves a section and saves the new order', () => {
        const { onSave } = renderConfigurator();
        fireEvent.click(
            within(rowOf('whoReadsAlong')).getByRole('button', { name: 'conversationModules.section.moveUp' }),
        );
        fireEvent.click(saveButton());
        const saved = onSave.mock.calls[0][0];
        expect(saved.sections[0].prototypeId).toBe('whoReadsAlong');
        expect(saved.sections[1].prototypeId).toBe('greeting');
    });

    it('warns, without blocking, when the emergency numbers are removed, and can put them back', () => {
        const { onSave } = renderConfigurator();
        expect(screen.queryByTestId('module-safety-warning')).toBeNull();
        fireEvent.click(
            within(rowOf('emergencyNumbers')).getByRole('button', { name: 'conversationModules.section.remove' }),
        );
        expect(screen.getByTestId('module-safety-warning')).toBeInTheDocument();
        expect(saveButton()).not.toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'conversationModules.safety.restore' }));
        expect(screen.queryByTestId('module-safety-warning')).toBeNull();
        fireEvent.click(saveButton());
        expect(onSave.mock.calls[0][0].sections.some((s: any) => s.prototypeId === 'emergencyNumbers')).toBe(true);
    });

    it('adds a question block to the greeting', () => {
        const { onSave } = renderConfigurator();
        fireEvent.click(screen.getByTestId('module-add-questions'));
        fireEvent.click(saveButton());
        const greeting = onSave.mock.calls[0][0].sections.filter((s: any) => s.field === 'greeting');
        expect(greeting.at(-1).kind).toBe('questions');
        expect(greeting.at(-1).trigger).toBe('withGreeting');
    });

    it('resets to the prototype after confirmation', () => {
        const { onSave } = renderConfigurator({ module: { ...prototypeFor('AGENCY_COUNSELLING'), sections: [] } });
        expect(screen.getByText('conversationModules.empty.field')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'conversationModules.dialog.reset' }));
        fireEvent.click(screen.getByRole('button', { name: 'conversationModules.dialog.resetConfirmOk' }));
        fireEvent.click(saveButton());
        expect(onSave.mock.calls[0][0].sections.length).toBe(prototypeFor('AGENCY_COUNSELLING').sections.length);
    });

    it('offers the registration tab only when registration settings are passed', () => {
        renderConfigurator();
        expect(screen.queryByRole('tab', { name: 'conversationModules.tab.registration' })).toBeNull();
        cleanup();
        const { onSave } = renderConfigurator({
            initialTab: 'registration',
            registration: {
                settings: { platformDefault: CARITAS_PLATFORM_DEFAULT, topics: {} },
                topics: [{ id: 2, name: 'Sucht' }],
            },
        });
        const topic = screen.getByTestId('registration-topic-2');
        fireEvent.click(within(topic).getAllByRole('switch')[0]);
        fireEvent.click(saveButton());
        expect(onSave.mock.calls[0][1].topics[2].postcode).toBe(false);
    });
});
