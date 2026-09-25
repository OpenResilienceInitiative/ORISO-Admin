import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { Form } from 'antd';
import { useLayoutEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../../../theme/orisoMuiTheme';
import { UseAppConfigProvider, useAppConfigContext } from '../../../../../context/useAppConfig';
import { AgencySettings } from '.';

/**
 * ORISO-UserService#1264 (ADR-014 amendment 2026-09-25): the global switch
 * `oneTopicPerAgencyEnabled` turns the topic picker into a single-select. An agency that already
 * holds several topics keeps showing all of them, can shed topics but not gain one.
 */
const topics = [
    { id: 1, name: 'Allgemeine Sozialberatung', status: 'ACTIVE' },
    { id: 2, name: 'Schuldnerberatung', status: 'ACTIVE' },
    { id: 3, name: 'Suchtberatung', status: 'ACTIVE' },
];

const SeedSwitch = ({ on }: { on: boolean }) => {
    const { setManualSettings } = useAppConfigContext();
    useLayoutEffect(() => setManualSettings({ oneTopicPerAgencyEnabled: on }), [on, setManualSettings]);
    return null;
};

const meta: Meta<typeof AgencySettings> = {
    title: 'Organisms/Agency/AgencySettings/TopicPicker',
    component: AgencySettings,
    args: { isEditMode: true },
    parameters: {
        msw: { handlers: [http.get('*/service/topic*', () => HttpResponse.json(topics))] },
    },
    decorators: [
        (Story, { parameters }) => (
            <UseAppConfigProvider>
                <SeedSwitch on={Boolean(parameters.oneTopicPerAgency)} />
                <ThemeProvider theme={orisoMuiTheme}>
                    <div style={{ maxWidth: 440 }}>
                        <Form layout="vertical" initialValues={{ topicIds: parameters.topicIds ?? [] }}>
                            <Story />
                        </Form>
                    </div>
                </ThemeProvider>
            </UseAppConfigProvider>
        ),
    ],
};
export default meta;
type Story = StoryObj<typeof AgencySettings>;

const pick = async (canvasElement: HTMLElement, name: string) => {
    const combobox = await within(canvasElement).findByRole('combobox', { name: /Themen/ });
    // The multi-select keeps its list open after a pick; clicking again would close it.
    if (!within(document.body).queryByRole('listbox')) await userEvent.click(combobox);
    await userEvent.click(await within(document.body).findByRole('option', { name }));
};

export const SwitchOffMultiSelect: Story = {
    parameters: { oneTopicPerAgency: false },
    play: async ({ canvasElement }) => {
        await pick(canvasElement, 'Allgemeine Sozialberatung');
        await pick(canvasElement, 'Schuldnerberatung');
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('button', { name: 'Allgemeine Sozialberatung' })).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Schuldnerberatung' })).toBeVisible();
    },
};

export const SwitchOnSingleSelect: Story = {
    parameters: { oneTopicPerAgency: true, topicIds: [{ value: '1', label: 'Allgemeine Sozialberatung' }] },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const combobox = await canvas.findByRole('combobox', { name: /Themen/ });
        await waitFor(() => expect(combobox).toHaveValue('Allgemeine Sozialberatung'));
        await expect(canvas.getByText(/nur ein Thema \(Fachbereich\) pro Beratungsstelle/)).toBeVisible();
        await pick(canvasElement, 'Schuldnerberatung');
        await expect(combobox).toHaveValue('Schuldnerberatung');
        await expect(canvas.queryByRole('button', { name: 'Allgemeine Sozialberatung' })).toBeNull();
    },
};

export const SwitchOnLegacyMultiTopicAgency: Story = {
    parameters: {
        oneTopicPerAgency: true,
        topicIds: [
            { value: '1', label: 'Allgemeine Sozialberatung' },
            { value: '2', label: 'Schuldnerberatung' },
        ],
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('alert')).toHaveTextContent(
            /2 Themen\. .*nur ein Thema \(Fachbereich\) pro Beratungsstelle/,
        );
        await expect(canvas.getByRole('button', { name: 'Allgemeine Sozialberatung' })).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Schuldnerberatung' })).toBeVisible();
        await userEvent.click(canvas.getByRole('combobox', { name: /Themen/ }));
        const extra = await within(document.body).findByRole('option', { name: 'Suchtberatung' });
        await expect(extra).toHaveAttribute('aria-disabled', 'true');
    },
};
