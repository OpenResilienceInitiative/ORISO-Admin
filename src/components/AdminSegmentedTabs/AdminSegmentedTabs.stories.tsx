import {
    AdminPanelSettingsOutlined,
    BalanceOutlined,
    CategoryOutlined,
    EmailOutlined,
    SettingsOutlined,
} from '@mui/icons-material';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AdminSegmentedTabs } from './AdminSegmentedTabs';

const meta = {
    title: 'Molecules/AdminSegmentedTabs',
    component: AdminSegmentedTabs,
    parameters: {
        layout: 'padded',
    },
    args: {
        ariaLabel: 'Einstellungen',
        activeId: 'global',
        items: [
            { id: 'global', label: 'Globale Konfigurationen', icon: <SettingsOutlined /> },
            { id: 'appearance', label: 'Erscheinungsbild', icon: <CategoryOutlined /> },
            { id: 'legal', label: 'Rechtliches', icon: <BalanceOutlined /> },
            { id: 'smtp', label: 'SMTP-Server', icon: <EmailOutlined /> },
            { id: 'permissions', label: 'Funktionszugriff', icon: <AdminPanelSettingsOutlined /> },
        ],
    },
} satisfies Meta<typeof AdminSegmentedTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SettingsTabs: Story = {};

export const AppearanceActive: Story = {
    args: {
        activeId: 'appearance',
    },
};
