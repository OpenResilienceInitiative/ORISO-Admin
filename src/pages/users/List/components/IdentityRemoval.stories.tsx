import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import i18n from 'i18next';
// eslint-disable-next-line import/no-unresolved -- Storybook10 package subpath
import { expect, fn, waitFor, within } from 'storybook/test';
import { DeleteUserModal } from './DeleteUser';
import { DeleteTenantAdminModal } from './DeleteTenantAdmin';
import { USER_DATA_KEY } from '../../../../hooks/useUserData.hook';
import { UserRole } from '../../../../enums/UserRole';
import { setStoryAuth, withSeededAdminProviders } from '../../../../utils/storybook/adminStoryDecorators';
import { X_REASON } from '../../../../api/fetchData';
import type { CounselorData } from '../../../../types/counselor';

interface ExampleProps {
    removing: 'consultants' | 'admins' | 'tenant-admins';
    hasOtherIdentity?: boolean;
    scopedAccountCommands: boolean | null;
    targetId: string;
    onClose: () => void;
}

const IdentityRemovalExample = ({ removing, targetId, hasOtherIdentity, onClose }: ExampleProps) =>
    removing === 'tenant-admins' ? (
        <DeleteTenantAdminModal
            user={{ id: targetId, firstname: 'Anna', lastname: 'Muster', hasOtherIdentity } as CounselorData}
            onClose={onClose}
        />
    ) : (
        <DeleteUserModal
            typeOfUser={removing}
            deleteUserId={targetId}
            hasOtherIdentity={hasOtherIdentity}
            onClose={onClose}
        />
    );

const meta = {
    title: 'Organisms/Pages/Users/IdentityRemoval',
    component: IdentityRemovalExample,
    parameters: { layout: 'fullscreen', a11y: { test: 'error' } },
    args: {
        removing: 'consultants',
        hasOtherIdentity: true,
        scopedAccountCommands: true,
        targetId: 'storybook-target',
        onClose: fn(),
    },
    decorators: [
        (Story, { args }) => {
            setStoryAuth([UserRole.AgencyAdmin, UserRole.TenantAdmin, UserRole.UserAdmin], 1);
            return withSeededAdminProviders(Story, (client) => {
                client.setQueryDefaults([USER_DATA_KEY], { staleTime: Infinity });
                client.setQueryData([USER_DATA_KEY], {
                    userId: 'storybook-operator',
                    scopedAccountCommands: args.scopedAccountCommands,
                });
            });
        },
    ],
} satisfies Meta<typeof IdentityRemovalExample>;
export default meta;
type Story = StoryObj<typeof meta>;

const assertRemaining = async (canvasElement: HTMLElement, identity: 'consultant' | 'administrator') => {
    const dialog = within(await within(canvasElement.ownerDocument.body).findByRole('dialog'));
    await waitFor(() =>
        expect(dialog.getByText(String(i18n.t(`identityRemoval.remaining.${identity}`)))).toBeVisible(),
    );
    await expect(dialog.getByRole('button', { name: String(i18n.t('delete')) })).toBeEnabled();
};

/** Existing M3 confirmation; removing Consultant access does not delete Administrator access. */
export const ConsultantKeepsAdministrator: Story = {
    play: ({ canvasElement }) => assertRemaining(canvasElement, 'administrator'),
};
export const AgencyAdministratorKeepsConsultant: Story = {
    args: { removing: 'admins' },
    play: ({ canvasElement }) => assertRemaining(canvasElement, 'consultant'),
};
export const TenantAdministratorKeepsConsultant: Story = {
    args: { removing: 'tenant-admins' },
    play: ({ canvasElement }) => assertRemaining(canvasElement, 'consultant'),
};
export const SingleIdentity: Story = {
    args: { hasOtherIdentity: false },
    play: async ({ canvasElement }) => {
        const dialog = within(await within(canvasElement.ownerDocument.body).findByRole('dialog'));
        await expect(dialog.queryByText(String(i18n.t('identityRemoval.remaining.administrator')))).toBeNull();
        await expect(dialog.queryByText(String(i18n.t('identityRemoval.possibleRemaining.administrator')))).toBeNull();
    },
};
export const UnknownIdentityProjection: Story = {
    args: { hasOtherIdentity: undefined },
    play: async ({ canvasElement }) => {
        const dialog = within(await within(canvasElement.ownerDocument.body).findByRole('dialog'));
        await waitFor(() =>
            expect(dialog.getByText(String(i18n.t('identityRemoval.possibleRemaining.administrator')))).toBeVisible(),
        );
    },
};

const assertBlocked = async (canvasElement: HTMLElement, key: string) => {
    const dialog = within(await within(canvasElement.ownerDocument.body).findByRole('dialog'));
    const confirm = dialog.getByRole('button', { name: String(i18n.t('delete')) });
    await expect(confirm).toBeDisabled();
    await expect(confirm).toHaveAccessibleDescription(String(i18n.t(key)));
};
export const OwnAdministratorCannotBeRemoved: Story = {
    args: { removing: 'tenant-admins', targetId: 'storybook-operator' },
    play: ({ canvasElement }) => assertBlocked(canvasElement, 'identityRemoval.selfAdministrator'),
};
export const LegacyCombinedIdentityUnavailable: Story = {
    args: { scopedAccountCommands: false },
    play: ({ canvasElement }) => assertBlocked(canvasElement, 'identityRemoval.unavailable'),
};
export const AvailabilityPending: Story = {
    args: { scopedAccountCommands: null },
    play: ({ canvasElement }) => assertBlocked(canvasElement, 'identityRemoval.checkingAvailability'),
};

let requests: { key: string | null; url: string }[] = [];
export const UnknownResultRetriesOriginalRemoval: Story = {
    beforeEach: () => {
        requests = [];
    },
    parameters: {
        msw: {
            handlers: [
                http.delete('*/service/useradmin/consultants/:id', ({ request }) => {
                    requests.push({ key: request.headers.get('Idempotency-Key'), url: request.url });
                    return new HttpResponse(null, { status: requests.length === 1 ? 503 : 204 });
                }),
            ],
        },
    },
    play: async ({ canvasElement, userEvent }) => {
        const dialog = within(await within(canvasElement.ownerDocument.body).findByRole('dialog'));
        await userEvent.click(dialog.getByRole('button', { name: String(i18n.t('delete')) }));
        await expect(await dialog.findByRole('alert')).toHaveTextContent(
            String(i18n.t('accountOperation.outcomeUnknown')),
        );
        await expect(dialog.queryByRole('checkbox')).toBeNull();
        await userEvent.click(dialog.getByRole('button', { name: String(i18n.t('delete')) }));
        await waitFor(() => expect(requests).toHaveLength(2));
        await expect(requests[0].key).toMatch(/^[0-9a-f-]{36}$/);
        await expect(requests[1]).toEqual(requests[0]);
    },
};

export const VerifiedSessionsRefusalOffersExplicitForce: Story = {
    beforeEach: () => {
        requests = [];
    },
    parameters: {
        msw: {
            handlers: [
                http.delete('*/service/useradmin/consultants/:id', ({ request }) => {
                    const key = request.headers.get('Idempotency-Key');
                    requests.push({ key, url: request.url });
                    return requests.length === 1
                        ? HttpResponse.json(
                              { reason: X_REASON.CONSULTANT_HAS_ACTIVE_OR_ARCHIVE_SESSIONS },
                              {
                                  status: 400,
                                  headers: {
                                      'X-ORISO-Mutation-Outcome': 'NO_EFFECT',
                                      'X-ORISO-Mutation-Operation': key ?? '',
                                  },
                              },
                          )
                        : new HttpResponse(null, { status: 204 });
                }),
            ],
        },
    },
    play: async ({ canvasElement, userEvent }) => {
        const dialog = within(await within(canvasElement.ownerDocument.body).findByRole('dialog'));
        await userEvent.click(dialog.getByRole('button', { name: String(i18n.t('delete')) }));
        const checkbox = await dialog.findByRole('checkbox');
        const confirm = dialog.getByRole('button', { name: String(i18n.t('forceDelete')) });
        await expect(confirm).toBeDisabled();
        await userEvent.click(checkbox);
        await userEvent.click(confirm);
        await waitFor(() => expect(requests).toHaveLength(2));
        await expect(requests[1].key).not.toBe(requests[0].key);
        await expect(new URL(requests[1].url).searchParams.get('forceDeleteSessions')).toBe('true');
    },
};

const english = async () => {
    const previous = i18n.language;
    await i18n.changeLanguage('en');
    return async () => {
        await i18n.changeLanguage(previous);
    };
};
const fitAndFocus: (width: number, height: number) => NonNullable<Story['play']> =
    (width, height) =>
    async ({ canvasElement, userEvent }) => {
        const document = canvasElement.ownerDocument;
        const dialog = await within(document.body).findByRole('dialog');
        await waitFor(() => expect(dialog).toBeVisible());
        const window = document.defaultView!;
        await expect(window.innerWidth).toBe(width);
        await expect(window.innerHeight).toBe(height);
        const bounds = dialog.getBoundingClientRect();
        await expect(bounds.left).toBeGreaterThanOrEqual(0);
        await expect(bounds.right).toBeLessThanOrEqual(width);
        await expect(bounds.top).toBeGreaterThanOrEqual(0);
        await expect(bounds.bottom).toBeLessThanOrEqual(height);
        await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
        // Ant Modal moves focus after its entry animation and at the focus sentinels.
        await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
        await userEvent.tab();
        await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
        await userEvent.tab();
        await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
        await userEvent.tab();
        await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
        await expect(within(dialog).getByText(String(i18n.t('identityRemoval.remaining.consultant')))).toBeVisible();
    };

/** The longest new copy is German. These use the production dialog, not a visual replica. */
export const GermanPhone390: Story = {
    args: { removing: 'admins' },
    globals: { viewport: { value: 'phone', isRotated: false } },
    play: fitAndFocus(390, 844),
};
export const GermanTablet820: Story = {
    args: { removing: 'tenant-admins' },
    parameters: {
        viewport: { options: { tablet820: { name: 'Tablet 820', styles: { width: '820px', height: '1180px' } } } },
    },
    globals: { viewport: { value: 'tablet820', isRotated: false } },
    play: fitAndFocus(820, 1180),
};
export const EnglishDesktop1440: Story = {
    args: { removing: 'admins' },
    beforeEach: english,
    globals: { viewport: { value: 'desktop', isRotated: false } },
    play: fitAndFocus(1440, 900),
};
export const EnglishPhone390: Story = {
    ...GermanPhone390,
    beforeEach: english,
};
export const GermanPhone320: Story = {
    args: { removing: 'admins' },
    parameters: {
        viewport: { options: { phone320: { name: 'Phone 320', styles: { width: '320px', height: '740px' } } } },
    },
    globals: { viewport: { value: 'phone320', isRotated: false } },
    play: fitAndFocus(320, 740),
};
export const EnglishPhone412: Story = {
    args: { removing: 'tenant-admins' },
    beforeEach: english,
    parameters: {
        viewport: { options: { phone412: { name: 'Phone 412', styles: { width: '412px', height: '915px' } } } },
    },
    globals: { viewport: { value: 'phone412', isRotated: false } },
    play: fitAndFocus(412, 915),
};
