import type { Meta, StoryObj } from '@storybook/react-vite';
import { tenantEditDecorator, tenantEditHandlers } from './tenantEditStoryHarness';

/**
 * The Träger edit page of a platform admin (`/admin/tenants/:id/...`), one story per tab, with the
 * real sticky header, the underline tab bar and the tab's own tiles. Check each at 1440 and 390 wide.
 */
const meta = {
    title: 'Admin/Tenant/Tabs',
    parameters: { layout: 'fullscreen', msw: { handlers: tenantEditHandlers } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const MasterData: Story = { decorators: [tenantEditDecorator('general')] };

export const Appearance: Story = { decorators: [tenantEditDecorator('theme-settings')] };

export const Legal: Story = { decorators: [tenantEditDecorator('legal-settings')] };

export const Introduction: Story = { decorators: [tenantEditDecorator('erstantwort')] };

export const EmailServer: Story = { decorators: [tenantEditDecorator('smtp')] };

export const FunctionalityAccess: Story = { decorators: [tenantEditDecorator('global-settings')] };

export const Functionalities: Story = { decorators: [tenantEditDecorator('functionalities')] };

/** The platform admin's "create Träger" dialog (`/admin/tenants/add`): the Träger's parts and the first admin as panels. */
export const CreateTenant: Story = { decorators: [tenantEditDecorator('general', 'add')] };
