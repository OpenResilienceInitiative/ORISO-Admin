import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import deDE from 'antd/es/locale/de_DE';
import { CentreSetupProposal } from './CentreSetupProposal';

it('saves two centres, copies only address, and keeps the first saved centre unchanged', async () => {
    render(<CentreSetupProposal />);
    fireEvent.click(screen.getByRole('button', { name: 'Beratungsstelle speichern' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Weitere Beratungsstelle' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('checkbox', { name: /Adresse/ }));
    fireEvent.click(dialog.getByRole('button', { name: 'Auswahl übernehmen' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /^Telefon$/ })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /^Stadt/ })).toHaveValue('Berlin');
    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'Beratung Süd' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^Stadt/ }), { target: { value: 'Potsdam' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allgemeine Sozialberatung' }));
    fireEvent.click(screen.getByRole('button', { name: 'Beratungsstelle speichern' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Einrichtung abschließen' }));
    expect(await screen.findByRole('heading', { name: 'Ihre Beratungsstellen sind eingerichtet' })).toBeInTheDocument();
    expect(screen.getByText('Berlin', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Potsdam', { exact: true })).toBeInTheDocument();
});

it('retains edits after a failed save and retries without creating duplicate centres', async () => {
    render(<CentreSetupProposal failNextSave />);
    fireEvent.change(screen.getByRole('textbox', { name: /^Stadt/ }), { target: { value: 'Hamburg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Beratungsstelle speichern' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ihre Eingaben bleiben erhalten');
    expect(screen.getByRole('textbox', { name: /^Stadt/ })).toHaveValue('Hamburg');
    fireEvent.click(screen.getByRole('button', { name: 'Beratungsstelle speichern' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Einrichtung abschließen' }));
    expect(screen.getAllByRole('heading', { name: 'Beratung Mitte' })).toHaveLength(1);
    expect(screen.getByText('Hamburg', { exact: true })).toBeInTheDocument();
});

it('denies another save when the simulated permission is revoked, keeping saved centres', async () => {
    render(<CentreSetupProposal initialStep="saved" />);
    fireEvent.click(screen.getByRole('button', { name: 'Weitere Beratungsstelle' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('checkbox', { name: /Adresse/ }));
    fireEvent.click(dialog.getByRole('button', { name: 'Auswahl übernehmen' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allgemeine Sozialberatung' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Weitere Beratungsstellen im eigenen Träger erlauben/ }));
    expect(screen.getByRole('button', { name: 'Beratungsstelle speichern' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Bereits gespeicherte Beratungsstellen bleiben erhalten');
    fireEvent.click(screen.getByRole('button', { name: 'Zur gespeicherten Beratungsstelle' }));
    expect(screen.getByRole('heading', { name: 'Beratung Mitte' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Weitere Beratungsstelle' })).not.toBeInTheDocument();
});

it('completes the first invited centre without the additional-centre permission', async () => {
    render(<CentreSetupProposal allowAdditional={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Beratungsstelle speichern' }));
    expect(await screen.findByRole('button', { name: 'Einrichtung abschließen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Weitere Beratungsstelle' })).not.toBeInTheDocument();
    expect(screen.getByText(/Weitere Beratungsstellen benötigen die zusätzliche Erlaubnis/)).toBeInTheDocument();
});

it('cancels reuse without creating a centre, then starts a completely empty next form', async () => {
    render(<CentreSetupProposal initialStep="saved" />);
    fireEvent.click(screen.getByRole('button', { name: 'Weitere Beratungsstelle' }));
    let dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('checkbox', { name: /Adresse/ }));
    fireEvent.click(dialog.getByRole('button', { name: 'Abbrechen' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getAllByRole('heading', { name: 'Beratung Mitte' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Weitere Beratungsstelle' }));
    dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('checkbox', { name: /Adresse/ })).not.toBeChecked();
    fireEvent.click(dialog.getByRole('button', { name: 'Auswahl übernehmen' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /^Stadt/ })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /^PLZ/ })).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: 'Allgemeine Sozialberatung' })).not.toBeChecked();
});

it('switches language without losing edited fields or selected topic identities', () => {
    render(<CentreSetupProposal />);
    fireEvent.change(screen.getByRole('textbox', { name: /^Stadt/ }), { target: { value: 'Bremen' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Eltern und Familie' }));
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('textbox', { name: /^City/ })).toHaveValue('Bremen');
    expect(screen.getByRole('checkbox', { name: 'Parents and family' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'General social counselling' })).toBeChecked();
});

it.each([
    ['de', 'Schließen'],
    ['en', 'Close'],
] as const)(
    'localizes the copy dialog close action in %s even inside the German app provider',
    async (locale, closeLabel) => {
        render(
            <ConfigProvider locale={deDE}>
                <CentreSetupProposal locale={locale} initialStep="copy" />
            </ConfigProvider>,
        );
        const dialog = within(screen.getByRole('dialog'));
        const close = dialog.getByRole('button', { name: closeLabel, exact: true });
        expect(close).toBeEnabled();
        expect(screen.getByRole('main')).toHaveAttribute('lang', locale);
        fireEvent.click(close);
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    },
);
