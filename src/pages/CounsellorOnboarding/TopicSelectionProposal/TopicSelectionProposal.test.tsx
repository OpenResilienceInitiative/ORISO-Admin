import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopicSelectionProposal } from './index';

describe('topic selection design proposal', () => {
    it('cancels draft choices, applies a later choice and preserves it and the entered name across languages', async () => {
        const user = userEvent.setup();
        render(<TopicSelectionProposal />);
        await user.type(screen.getByLabelText('Anzeigename'), 'Georgia');
        await user.click(screen.getByRole('button', { name: 'Themen auswählen' }));
        let dialog = within(screen.getByRole('dialog'));
        await user.click(dialog.getByRole('checkbox', { name: 'Schulden' }));
        await user.click(dialog.getByRole('button', { name: 'Abbrechen' }));
        expect(screen.queryByRole('checkbox', { name: 'Schulden entfernen' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Themen auswählen' }));
        dialog = within(screen.getByRole('dialog'));
        expect(dialog.getByRole('checkbox', { name: 'Schulden' })).not.toBeChecked();
        await user.click(dialog.getByRole('checkbox', { name: 'Schulden' }));
        await user.click(dialog.getByRole('button', { name: 'Anwenden' }));
        await user.selectOptions(screen.getByRole('combobox', { name: 'Sprache' }), 'en');
        expect(screen.getByLabelText('Display name')).toHaveValue('Georgia');
        expect(screen.getByRole('checkbox', { name: 'Remove Debt' })).toBeVisible();
        await user.click(screen.getByRole('button', { name: 'Choose topics' }));
        dialog = within(screen.getByRole('dialog'));
        await user.type(dialog.getByLabelText('Search topics'), 'Debt');
        expect(dialog.getByRole('checkbox', { name: 'Debt' })).toBeChecked();
        expect(dialog.queryByRole('checkbox', { name: 'Addiction' })).not.toBeInTheDocument();
    });
    it('keeps invitation-fixed topics locked and never offers a topic outside the centre permission', async () => {
        render(<TopicSelectionProposal permission="NONE" fixed initialOpen />);
        const dialog = within(screen.getByRole('dialog'));
        expect(dialog.getByRole('checkbox', { name: 'Eltern und Familie' })).toBeDisabled();
        expect(dialog.getByRole('checkbox', { name: 'Schulden' })).toBeDisabled();
        expect(dialog.queryByRole('checkbox', { name: 'Sucht' })).not.toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Eltern und Familie entfernen' })).toBeDisabled();
    });

    it('shows a failed load without permitting apply and lets the reviewer retry the example catalogue', async () => {
        const user = userEvent.setup();
        render(<TopicSelectionProposal initialOpen initialStatus="error" />);
        const dialog = within(screen.getByRole('dialog'));
        expect(dialog.getByRole('alert')).toHaveTextContent('Die Themen konnten nicht geladen werden.');
        expect(dialog.getByRole('button', { name: 'Anwenden' })).toBeDisabled();
        await user.click(dialog.getByRole('button', { name: 'Erneut versuchen' }));
        await waitFor(() => expect(dialog.getByRole('checkbox', { name: 'Schulden' })).toBeEnabled());
        expect(dialog.getByRole('button', { name: 'Anwenden' })).toBeEnabled();
    });

    it('limits NONE to one centre topic and preserves the draft when the open dialog changes language', async () => {
        const user = userEvent.setup();
        render(<TopicSelectionProposal permission="NONE" />);
        await user.type(screen.getByLabelText('Anzeigename'), 'Frida');
        await user.click(screen.getByRole('button', { name: 'Themen auswählen' }));
        const dialog = within(screen.getByRole('dialog'));
        await user.click(dialog.getByRole('checkbox', { name: 'Schulden' }));
        expect(dialog.getByRole('checkbox', { name: 'Eltern und Familie' })).not.toBeChecked();
        await user.selectOptions(dialog.getByRole('combobox', { name: 'Sprache' }), 'en');
        expect(dialog.getByRole('checkbox', { name: 'Debt' })).toBeChecked();
        expect(dialog.queryByRole('checkbox', { name: 'Addiction' })).not.toBeInTheDocument();
        await user.click(dialog.getByRole('button', { name: 'Apply' }));
        expect(screen.getByLabelText('Display name')).toHaveValue('Frida');
        expect(screen.getByRole('checkbox', { name: 'Remove Debt' })).toBeVisible();
        expect(screen.queryByRole('checkbox', { name: 'Remove Parents and family' })).not.toBeInTheDocument();
    });
    it('offers only the centre topics for SELECT_EXISTING', () => {
        render(<TopicSelectionProposal permission="SELECT_EXISTING" initialOpen />);
        const dialog = within(screen.getByRole('dialog'));
        expect(dialog.getByRole('checkbox', { name: 'Schulden' })).toBeEnabled();
        expect(dialog.queryByRole('checkbox', { name: 'Sucht' })).not.toBeInTheDocument();
    });
});

it('retains an explicitly required topic in the draft and applied summary', async () => {
    const user = userEvent.setup();
    render(<TopicSelectionProposal requiredTopicIds={[101]} />);
    expect(screen.getByRole('checkbox', { name: 'Eltern und Familie entfernen' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Themen auswählen' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('checkbox', { name: 'Eltern und Familie' })).toBeDisabled();
    expect(dialog.getByRole('checkbox', { name: 'Eltern und Familie' })).toBeChecked();
    await user.click(dialog.getByRole('checkbox', { name: 'Schulden' }));
    expect(dialog.getByRole('checkbox', { name: 'Eltern und Familie' })).toBeDisabled();
    await user.click(dialog.getByRole('button', { name: 'Anwenden' }));
    expect(screen.getByRole('checkbox', { name: 'Eltern und Familie entfernen' })).toBeDisabled();
});

it('changes all seven preview languages without losing the name, draft or search input', async () => {
    const user = userEvent.setup();
    render(<TopicSelectionProposal />);
    await user.type(screen.getByLabelText('Anzeigename'), 'Georgia');
    await user.click(screen.getByRole('button', { name: 'Themen auswählen' }));
    let dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('checkbox', { name: 'Schulden' }));
    const cases = [
        ['en', 'Language', 'Search topics', 'Debt', 'Debt'],
        ['fr', 'Langue', 'Rechercher des thèmes', 'Dettes', 'Dettes et insolvabilité'],
        ['ru', 'Язык', 'Поиск тем', 'Долги', 'Долги и банкротство'],
        ['tr', 'Dil', 'Konu ara', 'Borç', 'Borç ve iflas'],
        ['uk', 'Мова', 'Пошук тем', 'Борги', 'Борги'],
        ['ti', 'ቋንቋ', 'ኣርእስቲ ድለ', 'ዕዳ', 'ዕዳን ክሳራን'],
        ['de', 'Sprache', 'Themen suchen', 'Schulden', 'Schulden'],
    ];
    let currentLabel = 'Sprache';
    let currentSearch = 'Themen suchen';
    await cases.reduce(async (previous, [locale, languageLabel, searchLabel, search, topic]) => {
        await previous;
        await user.clear(dialog.getByLabelText(currentSearch));
        await user.type(dialog.getByLabelText(currentSearch), search);
        await user.selectOptions(dialog.getByRole('combobox', { name: currentLabel }), locale);
        dialog = within(await screen.findByRole('dialog'));
        expect(await dialog.findByLabelText(searchLabel)).toHaveValue(search);
        expect(dialog.getByRole('checkbox', { name: topic })).toBeChecked();
        currentLabel = languageLabel;
        currentSearch = searchLabel;
    }, Promise.resolve());
    await user.click(dialog.getByRole('button', { name: 'Anwenden' }));
    expect(screen.getByLabelText('Anzeigename')).toHaveValue('Georgia');
    expect(screen.getByRole('checkbox', { name: 'Schulden entfernen' })).toBeVisible();
});

it('keeps required selections visible outside the centre choices and makes the whole topic label actionable', async () => {
    const user = userEvent.setup();
    render(<TopicSelectionProposal permission="SELECT_EXISTING" requiredTopicIds={[103]} initialOpen />);
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.queryByRole('checkbox', { name: 'Sucht' })).not.toBeInTheDocument();
    await waitFor(() => expect(dialog.getByText('Eltern und Familie · Sucht')).toBeVisible());
    await user.click(dialog.getByText('Schulden'));
    expect(dialog.getByRole('checkbox', { name: 'Schulden' })).toBeChecked();
    expect(dialog.getByRole('checkbox', { name: 'Schulden' })).toHaveFocus();
    await user.keyboard('[Space]');
    expect(dialog.getByRole('checkbox', { name: 'Schulden' })).not.toBeChecked();
    await user.keyboard('[Space]');
    expect(dialog.getByRole('checkbox', { name: 'Schulden' })).toBeChecked();
    await user.click(dialog.getByRole('button', { name: 'Anwenden' }));
    expect(screen.getByRole('checkbox', { name: 'Sucht entfernen' })).toBeDisabled();
});

it('disables the only selected choice and hides an unsatisfiable minimum prompt', async () => {
    const { unmount } = render(<TopicSelectionProposal initialOpen />);
    expect(within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'Eltern und Familie' })).toBeDisabled();
    unmount();
    render(<TopicSelectionProposal initialOpen initialStatus="empty" initialSelectedIds={[]} />);
    expect(screen.queryByText('Wählen Sie mindestens ein Thema.')).not.toBeInTheDocument();
});
