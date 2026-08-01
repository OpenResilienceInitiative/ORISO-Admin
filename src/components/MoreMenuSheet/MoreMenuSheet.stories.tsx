import {
    AssessmentOutlined,
    BalanceOutlined,
    EmailOutlined,
    HistoryOutlined,
    HolidayVillageOutlined,
    LinkOutlined,
    ListAltOutlined,
    PeopleOutlined,
    RealEstateAgentOutlined,
    SettingsOutlined,
} from '@mui/icons-material';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoreMenuSheet, type MoreMenuSheetGroup } from './MoreMenuSheet';

/** Everything a super admin can reach — including what the bar already shows. */
const destinations: MoreMenuSheetGroup = {
    label: 'Bereiche',
    activeKey: 'settings',
    entries: [
        { key: 'settings', label: 'Einstellungen', icon: <SettingsOutlined /> },
        { key: 'tenants', label: 'Träger', icon: <HolidayVillageOutlined /> },
        { key: 'agency', label: 'Beratungsstelle', icon: <RealEstateAgentOutlined /> },
        { key: 'users', label: 'Nutzer*innen', icon: <PeopleOutlined /> },
        { key: 'statistics', label: 'Statistiken', icon: <AssessmentOutlined /> },
        { key: 'links', label: 'Links', icon: <LinkOutlined /> },
        { key: 'logs', label: 'Logs', icon: <ListAltOutlined /> },
        { key: 'activity-logs', label: 'Aktivitäts-Logs', icon: <HistoryOutlined /> },
    ],
};

const sections: MoreMenuSheetGroup = {
    label: 'Sektionen',
    activeKey: 'legal',
    entries: [
        { key: 'global_config', label: 'Globale Einstellungen' },
        { key: 'legal', label: 'Rechtliches', icon: <BalanceOutlined /> },
        { key: 'email_server', label: 'E-Mail-Server', icon: <EmailOutlined /> },
    ],
};

const meta = {
    title: 'Organisms/MoreMenuSheet',
    component: MoreMenuSheet,
    parameters: { layout: 'fullscreen' },
    args: {
        ariaLabel: 'Weitere Bereiche',
        closeLabel: 'Menü schließen',
        groups: [destinations, sections],
        lang: 'de',
        onClose: () => {},
        open: true,
    },
} satisfies Meta<typeof MoreMenuSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Destinations and sections together, each with its current entry marked. */
export const Default: Story = {};

/** Screens with no sub-sections: the empty group is dropped, not left as a bare heading. */
export const DestinationsOnly: Story = {
    args: { groups: [destinations] },
};

/** A restricted agency admin reaches very little — the sheet must not look broken. */
export const FewDestinations: Story = {
    args: {
        groups: [{ label: 'Bereiche', activeKey: 'agency', entries: destinations.entries.slice(2, 4) }],
    },
};

const Dismissable = () => {
    const [open, setOpen] = useState(false);

    return (
        <div style={{ padding: 24 }}>
            <button onClick={() => setOpen(true)} type="button">
                Mehr öffnen
            </button>
            <MoreMenuSheet
                ariaLabel="Weitere Bereiche"
                closeLabel="Menü schließen"
                groups={[destinations, sections]}
                lang="de"
                onClose={() => setOpen(false)}
                open={open}
            />
        </div>
    );
};

/** Open, dismiss with the scrim or Escape, and watch focus return to the trigger. */
export const Dismissal: Story = {
    render: () => <Dismissable />,
};
