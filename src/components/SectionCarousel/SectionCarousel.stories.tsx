import {
    AdminPanelSettingsOutlined,
    BalanceOutlined,
    CategoryOutlined,
    EmailOutlined,
    PublicOutlined,
    SettingsOutlined,
    TuneOutlined,
} from '@mui/icons-material';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { getSectionArtwork } from '../../constants/sectionArtwork';
import { SectionCarousel, type SectionCarouselItem } from './SectionCarousel';

/**
 * The settings sections a super admin sees, keyed by the `iconName` from
 * `src/constants/settingsTabs.ts` — the same key the artwork files are named
 * after, so no second mapping is needed once the images land.
 */
const sections: SectionCarouselItem[] = [
    { key: 'global_config', label: 'Globale Einstellungen', icon: <SettingsOutlined /> },
    { key: 'appearance', label: 'Erscheinungsbild', icon: <CategoryOutlined /> },
    { key: 'legal', label: 'Rechtliches', icon: <BalanceOutlined /> },
    { key: 'email_server', label: 'E-Mail-Server', icon: <EmailOutlined /> },
    { key: 'functionality_access', label: 'Funktionszugriff', icon: <AdminPanelSettingsOutlined /> },
    { key: 'master_data', label: 'Stammdaten', icon: <PublicOutlined /> },
    { key: 'functionalities', label: 'App-Einstellungen', icon: <TuneOutlined /> },
];

/**
 * The same sections with their real artwork attached. `global_config` has no
 * illustration yet, so it stays on the icon fallback — deliberately left in the
 * strip rather than hidden, because a half-illustrated carousel is the state
 * this actually ships in.
 */
const sectionsWithArtwork: SectionCarouselItem[] = sections.map((section) => ({
    ...section,
    image: getSectionArtwork(section.key),
}));

const meta = {
    title: 'Organisms/SectionCarousel',
    component: SectionCarousel,
    parameters: {
        layout: 'fullscreen',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/RTUi1rcrEWECXz8rNFmj7Q/Design-System-M3_ORISO?node-id=61436-17414',
        },
    },
    args: {
        ariaLabel: 'Bereiche',
        items: sections,
        // An illustrated section, so the selected/dimmed contrast is actually
        // visible — `global_config` has no artwork and would show the fallback.
        activeKey: 'legal',
        lang: 'de',
    },
    decorators: [
        (Story, context) => (
            <div
                style={{
                    width: (context.parameters.deviceWidth as number | undefined) ?? 412,
                    padding: '24px 0',
                    background: 'var(--m3-surface, #fcf9f9)',
                }}
            >
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof SectionCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every card at full colour; only the label weight marks the open section. */
export const AllInColour: Story = {
    args: { dimUnselected: false, items: sectionsWithArtwork },
};

/**
 * The open section keeps its colour, the rest drain away — artwork and label
 * together. Compare against {@link AllInColour} to judge the effect.
 */
export const DimmedSiblings: Story = {
    args: { dimUnselected: true, items: sectionsWithArtwork },
};

/** No artwork yet: every card falls back to its icon and the strip still works. */
export const IconFallback: Story = {
    args: { dimUnselected: true },
};

/** Nothing selected yet: no card is dimmed, because there is nothing to dim against. */
export const NoSelection: Story = {
    args: { activeKey: undefined, dimUnselected: true },
};

/** A single section — the strip must not look broken with one card. */
export const SingleSection: Story = {
    args: { items: sections.slice(0, 1), activeKey: 'global_config', dimUnselected: true },
};

/** Narrow phone: the strip scrolls, cards keep their 96px width. */
export const NarrowPhone: Story = {
    parameters: { deviceWidth: 320 },
    args: { dimUnselected: true },
};

const SelectableCarousel = (args: React.ComponentProps<typeof SectionCarousel>) => {
    const [activeKey, setActiveKey] = useState('legal');

    // eslint-disable-next-line react/jsx-props-no-spreading
    return <SectionCarousel {...args} activeKey={activeKey} onSelect={setActiveKey} />;
};

/** Click through the sections to see the dimming follow the selection. */
export const Interactive: Story = {
    args: { dimUnselected: true, items: sectionsWithArtwork },
    render: (args) => <SelectableCarousel {...args} />,
};
