import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { fn } from 'storybook/test';
import { DpaPublishDeadlineDialog } from './index';

/** Empty required date/time field for both initial publication and renewal. */
const meta = {
    title: 'Organisms/Legal/DpaPublishDeadlineDialog',
    component: DpaPublishDeadlineDialog,
    args: { onConfirm: fn(), onCancel: fn() },
} satisfies Meta<typeof DpaPublishDeadlineDialog>;
export default meta;
type Story = StoryObj<typeof meta>;
export const EmptyDeadline: Story = {};
