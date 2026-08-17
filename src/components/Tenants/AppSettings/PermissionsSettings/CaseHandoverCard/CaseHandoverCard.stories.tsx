import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- exports-map subpath the eslint node resolver can't see (resolves for tsc/Vite)
import { expect, fn, userEvent, within } from 'storybook/test';
import { CaseHandoverCardView } from './CaseHandoverCardView';
import type { CaseHandoverReasonPolicy } from '../../../../../types/caseHandoverReasonPolicy';
import { PermissionsStoryFrame } from '../PermissionsStoryFrame';

const adviceNotificationTemplates = {
    de: 'Du hast einem zeitlich begrenzten Einblick zugestimmt. {{newAdvisor}} kann diese Sitzung für {{duration}} mitlesen. Deine bisherige Berater:in bleibt für dich zuständig.',
    en: 'You agreed to a time-limited review. {{newAdvisor}} can read this session for {{duration}}. Your current counsellor remains responsible for you.',
    fr: 'Vous avez accepté une consultation temporaire. {{newAdvisor}} peut consulter cette session pendant {{duration}}. Votre conseiller·ère habituel·le reste responsable de votre accompagnement.',
    ru: 'Вы согласились на временный просмотр консультации. {{newAdvisor}} может просматривать её в течение {{duration}}. Ваш текущий консультант по-прежнему отвечает за ваше консультирование.',
    tr: 'Süreli incelemeyi onayladınız. {{newAdvisor}} bu oturumu {{duration}} boyunca okuyabilir. Mevcut danışmanınız sizden sorumlu olmaya devam eder.',
    uk: 'Ви погодилися на тимчасовий перегляд консультації. {{newAdvisor}} може читати цю сесію протягом {{duration}}. Ваш поточний консультант залишається відповідальним за вас.',
    ti: 'ንግዜኡ ዝተወሰነ ምርኣይ ተሰማሚዕኩም። {{newAdvisor}} ነዚ ክፍለ ግዜ ን{{duration}} ከንብቦ ይኽእል። እቲ ሕጂ ዘሎ ኣማኻሪኹም ብሓላፍነት ይቕጽል።',
};

const policies: CaseHandoverReasonPolicy[] = [
    {
        code: 'COUNSELLOR_ASKED_FOR_ADVICE',
        label: 'Counsellor asked for advice',
        clientConsentRequired: true,
        accessAllowed: true,
        enabled: true,
        displayOrder: 10,
        policyAuthority: 'platform-admin-default-case-handover-policy',
        maxAccessDurationMinutes: 180,
        clientNotificationTemplates: adviceNotificationTemplates,
    },
    {
        code: 'COUNSELLOR_ON_HOLIDAY',
        label: 'Counsellor is on holiday',
        clientConsentRequired: false,
        accessAllowed: true,
        enabled: true,
        displayOrder: 20,
        policyAuthority: 'platform-admin-default-case-handover-policy',
    },
    {
        code: 'OTHER_EMERGENCY',
        label: 'Other emergency',
        clientConsentRequired: false,
        accessAllowed: true,
        enabled: true,
        displayOrder: 30,
        policyAuthority: 'platform-admin-default-case-handover-policy',
    },
    {
        code: 'COUNSELLOR_IS_ILL',
        label: 'Counsellor is ill',
        clientConsentRequired: true,
        accessAllowed: true,
        enabled: true,
        displayOrder: 40,
        policyAuthority: 'platform-admin-default-case-handover-policy',
        clientNotificationTemplates: {
            de: 'Deine bisherige Berater:in ist leider erkrankt. Damit du nicht warten musst, hat {{newAdvisor}} deinen Fall übernommen.',
            en: "Your previous counsellor is unfortunately ill. So you don't have to wait, {{newAdvisor}} has taken over your case.",
        },
    },
    {
        code: 'COUNSELLOR_LEFT',
        label: 'Counsellor does not work here anymore',
        clientConsentRequired: false,
        accessAllowed: true,
        enabled: true,
        displayOrder: 50,
        policyAuthority: 'platform-admin-default-case-handover-policy',
    },
];

const meta = {
    title: 'Organisms/Permissions/CaseHandoverCard',
    component: CaseHandoverCardView,
    parameters: {
        layout: 'padded',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=899-26642',
        },
    },
    args: {
        onModuleEnabledChange: () => undefined,
        onClientConsentChange: () => undefined,
        onNotificationTemplateChange: () => undefined,
        onMaxAccessDurationChange: () => undefined,
    },
    decorators: [
        (Story) => (
            <PermissionsStoryFrame>
                <Story />
            </PermissionsStoryFrame>
        ),
    ],
} satisfies Meta<typeof CaseHandoverCardView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Platform admin editing the case-handover ("Fallübernahme") policy: master
 *  toggle, per-reason client-consent toggles and the per-language notification
 *  templates are live; advisor consent and footer actions remain disabled
 *  until their backend lands (disable, don't hide). */
export const Editable: Story = {
    args: {
        policies,
        isLoading: false,
        canEdit: true,
        moduleEnabled: true,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const languageTabs = within(
            canvas.getByRole('tablist', {
                name: /Sprachen der Systembenachrichtigung|System notification languages/i,
            }),
        ).getAllByRole('tab');
        await expect(languageTabs).toHaveLength(7);
        await languageTabs.reduce(async (previousTab, tab) => {
            await previousTab;
            await userEvent.click(tab);
            const input = canvas.getByTestId('case-handover-template-input') as HTMLTextAreaElement;
            await expect(input.value).toContain('{{newAdvisor}}');
            await expect(input.value).toContain('{{duration}}');
        }, Promise.resolve());
        await userEvent.click(languageTabs[0]);
    },
};

/** Read-only ceiling: admins without policy-edit permission see the same card
 *  with every control disabled. */
export const ReadOnly: Story = {
    args: {
        policies,
        isLoading: false,
        canEdit: false,
        moduleEnabled: true,
    },
};

/** Figma 1789:11645 — clicking the master policy FAB reveals the four
 * policy states and the information action. Kept open for visual review. */
export const PolicyMenuOpen: Story = {
    args: {
        policies,
        isLoading: false,
        canEdit: true,
        moduleEnabled: true,
        openPolicyMenu: 'caseHandoverEnabled',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(
            canvas.getByRole('button', { name: /^(Activation enforced|Aktivierung erzwungen)$/i }),
        ).toBeVisible();
        await expect(
            canvas.getByRole('button', { name: /^(Deactivation enforced|Deaktivierung erzwungen)$/i }),
        ).toBeVisible();
        await expect(
            canvas.getByRole('button', { name: /^(Activation \(adjustable\)|Aktivierung \(anpassbar\))$/i }),
        ).toBeVisible();
        await expect(
            canvas.getByRole('button', { name: /^(Deactivation \(adjustable\)|Deaktivierung \(anpassbar\))$/i }),
        ).toBeVisible();
        await expect(canvas.getByRole('button', { name: /^(More information|Weitere Informationen)$/i })).toBeVisible();
    },
};

/** Module switched off: per-reason consent toggles are locked while off. */
export const ModuleDisabled: Story = {
    args: {
        policies: policies.map((policy) => ({ ...policy, enabled: false })),
        isLoading: false,
        canEdit: true,
        moduleEnabled: false,
    },
};

/** Per-reason, per-language template editing: stored backend value wins over the
 *  sample copy; edits commit on blur via onNotificationTemplateChange. */
export const TemplateEditing: Story = {
    args: {
        policies,
        isLoading: false,
        canEdit: true,
        moduleEnabled: true,
        onNotificationTemplateChange: fn(),
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('tab', { name: /krank|ill/i }));
        const input = canvas.getByTestId('case-handover-template-input') as HTMLTextAreaElement;
        await expect(input.value).toContain('{{newAdvisor}}');
        await userEvent.clear(input);
        await userEvent.type(input, 'Neuer Text für die Übergabe.');
        await userEvent.tab();
        await expect(args.onNotificationTemplateChange).toHaveBeenCalled();
    },
};

export const Loading: Story = {
    args: {
        policies: [],
        isLoading: true,
        canEdit: true,
        moduleEnabled: false,
    },
};
