import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from 'antd';
import { Page } from '../../../components/Page';
import { getSettingsTabs } from '../../../constants/settingsTabs';
import {
    ErstantwortTextsCard,
    type ErstantwortContentMap,
} from '../../../components/Tenants/AppSettings/ErstantwortSettings/ErstantwortTextsCard';

/**
 * The Erstantwort page (ORISO-Admin#601): the real settings tab bar from `getSettingsTabs`
 * (tab "Erstantwort") above the Träger texts card. The container's data hooks are not mocked
 * here; the card is driven by local state so the filled and the emptied field state are visible.
 */
const meta = {
    title: 'Pages/TenantSettings/ErstantwortSettingsPage',
    component: Page,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

const tabs = getSettingsTabs({
    isSuperAdmin: false,
    shouldShowThemeSettings: true,
    can: () => true,
    isTenantSettingsEditEnabled: true,
    multitenancyWithSingleDomainEnabled: false,
});

const filled: ErstantwortContentMap = {
    erstantwortGreeting: { de: '<p>Guten Tag und herzlich willkommen bei uns.</p>' },
    erstantwortWhoReadsAlong: { de: '<p>Ihre Nachricht lesen ausgebildete Fachkräfte.</p>' },
    erstantwortFreeNotice: { de: '<p>Die Beratung ist kostenfrei und vertraulich.</p>' },
    erstantwortClosing: { de: '<p>Wir melden uns so schnell wie möglich.</p>' },
};

const PageWithCard = ({ initial, days }: { initial: ErstantwortContentMap; days?: number }) => {
    const [content, setContent] = useState<ErstantwortContentMap>(initial);
    const [deadline, setDeadline] = useState<number | undefined>(days);
    return (
        <Page>
            <Page.Title titleKey="settings.title" subTitleKey="settings.title.text" tabs={tabs} />
            <ErstantwortTextsCard
                contentByBaustein={content}
                responseDeadlineDays={deadline}
                languageFormal
                onChange={(key, language, html) =>
                    setContent((previous) => ({ ...previous, [key]: { ...(previous[key] ?? {}), [language]: html } }))
                }
                onDeadlineChange={setDeadline}
            />
            <Button type="primary">Veröffentlichen</Button>
        </Page>
    );
};

/** Tab "Erstantwort" in the bar, German texts filled in, deadline 3 days. */
export const FilledGermanTexts: Story = {
    render: () => <PageWithCard initial={filled} days={3} />,
};

/** The greeting and the deadline were emptied: published as "" and 0, so the platform text and default apply. */
export const EmptiedField: Story = {
    render: () => <PageWithCard initial={{ ...filled, erstantwortGreeting: { de: '<p></p>' } }} days={undefined} />,
};
