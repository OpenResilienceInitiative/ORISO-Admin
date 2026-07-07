import type { Meta, StoryObj } from '@storybook/react-vite';
import { CaseHandoverCardView } from './CaseHandoverCardView';
import type { CaseHandoverReasonPolicy } from '../../../../../types/caseHandoverReasonPolicy';

const policies: CaseHandoverReasonPolicy[] = [
    {
        code: 'COUNSELLOR_ASKED_FOR_ADVICE',
        label: 'Counsellor asked for advice',
        clientConsentRequired: true,
        accessAllowed: true,
        enabled: true,
        displayOrder: 10,
        policyAuthority: 'platform-admin-default-case-handover-policy',
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
    },
    decorators: [
        (Story) => (
            <div style={{ width: 425 }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof CaseHandoverCardView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Platform admin editing the case-handover ("Fallübernahme") policy: master
 *  toggle + per-reason client-consent toggles are live; advisor consent,
 *  opt-out message, notification templates and footer actions are visible but
 *  disabled until their backend lands (disable, don't hide). */
export const Editable: Story = {
    args: {
        policies,
        isLoading: false,
        canEdit: true,
        moduleEnabled: true,
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

/** Module switched off: per-reason consent toggles are locked while off. */
export const ModuleDisabled: Story = {
    args: {
        policies: policies.map((policy) => ({ ...policy, enabled: false })),
        isLoading: false,
        canEdit: true,
        moduleEnabled: false,
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
