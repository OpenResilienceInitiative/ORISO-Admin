import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ErstantwortTextsCard, ErstantwortContentMap } from './index';
import type { ErstantwortBausteinKey } from '../erstantwortBausteine';

/**
 * The Träger editor for the Erstantwort Bausteine (ORISO-Admin#601, ADR-018).
 *
 * Three things are worth checking here, and each is a decision rather than layout:
 *
 * - **Five editors, not fifteen.** Everything else in the Erstantwort is platform
 *   text or *derived*. A derived Baustein has no field on purpose — a typed claim
 *   about the system can contradict the configuration, a rendered one cannot. That
 *   is why the deadline **number** is editable and its **sentence** is not.
 * - **One German variant.** A formal tenant is asked for "Sie" only, an informal
 *   one for "Du" only. Nobody writes both; only platform texts carry both axes.
 * - **No toggles.** The two safety-bearing Bausteine — "send us no personal data"
 *   and the emergency numbers — carry none at all (ADR-018 §6), so there is
 *   nothing here to switch off.
 */
const meta = {
    title: 'Tenants/Erstantwort/ErstantwortTextsCard',
    component: ErstantwortTextsCard,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
} satisfies Meta<typeof ErstantwortTextsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const Interactive = ({ languageFormal }: { languageFormal: boolean }) => {
    const [content, setContent] = useState<ErstantwortContentMap>({});
    const [days, setDays] = useState<number | undefined>(undefined);
    return (
        <ErstantwortTextsCard
            contentByBaustein={content}
            responseDeadlineDays={days}
            languageFormal={languageFormal}
            onChange={(key: ErstantwortBausteinKey, lng, html) =>
                setContent((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), [lng]: html } }))
            }
            onDeadlineChange={setDays}
        />
    );
};

/** A Träger that has authored nothing yet — every Baustein falls back to the platform. */
export const Empty: Story = {
    args: {
        contentByBaustein: {},
        responseDeadlineDays: undefined,
        languageFormal: true,
        onChange: () => undefined,
        onDeadlineChange: () => undefined,
    },
};

/** U25 as the reference case: informal, with the peer-counselling model in the free notice. */
export const InformalTraegerWithFreeNotice: Story = {
    args: {
        languageFormal: false,
        responseDeadlineDays: 5,
        contentByBaustein: {
            erstantwortGreeting: { 'de@informal': '<p>Schön, dass Du Dich meldest.</p>' },
            erstantwortWhoReadsAlong: {
                'de@informal': '<p>Deine Nachricht lesen ausgebildete Peers, begleitet von Fachkräften.</p>',
            },
            erstantwortFreeNotice: {
                'de@informal':
                    '<p>Wir beraten im Peer-Modell — junge Menschen beraten junge Menschen, mit Supervision.</p>',
            },
            erstantwortClosing: { 'de@informal': '<p>Bis bald.</p>' },
        },
        onChange: () => undefined,
        onDeadlineChange: () => undefined,
    },
};

/** Live typing, formal variant. */
export const InteractiveFormal: Story = {
    args: Empty.args,
    render: () => <Interactive languageFormal />,
};

/** Live typing, informal variant — note only "Du" is ever requested. */
export const InteractiveInformal: Story = {
    args: Empty.args,
    render: () => <Interactive languageFormal={false} />,
};

/** Read-only, e.g. for a role that may see but not change the Träger texts. */
export const Disabled: Story = {
    args: { ...Empty.args, disabled: true },
};
