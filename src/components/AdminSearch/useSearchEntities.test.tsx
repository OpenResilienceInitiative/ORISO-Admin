import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { TypeOfUser } from '../../enums/TypeOfUser';
import { useSearchEntities } from './useSearchEntities';

// The six list hooks are replaced by spies: this test is about which of them are switched on, and for whom.
const quiet = { data: undefined, isFetching: false, isError: false, dataUpdatedAt: 0 };
const mocks = vi.hoisted(() => ({
    tenants: vi.fn(),
    agencies: vi.fn(),
    topics: vi.fn(),
    accounts: vi.fn(),
    denied: new Set<string>(),
    asked: [] as Array<[unknown, string]>,
    superAdmin: true,
}));

vi.mock('../../hooks/useTenantsData', () => ({ useTenantsData: mocks.tenants }));
vi.mock('../../hooks/useAgencysData', () => ({ useAgenciesData: mocks.agencies }));
vi.mock('../../hooks/useTopicList', () => ({ useTopicList: mocks.topics }));
vi.mock('../../hooks/useConsultantsOrAdminsData', () => ({ useConsultantsOrAdminsData: mocks.accounts }));
vi.mock('../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({
        can: (action: unknown, resource: string) => {
            mocks.asked.push([action, resource]);

            return !mocks.denied.has(resource);
        },
    }),
}));
vi.mock('../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => ({ isSuperAdmin: mocks.superAdmin }) }));

const lastEnabled = (spy: ReturnType<typeof vi.fn>, typeOfUser?: TypeOfUser): boolean | undefined => {
    const calls = spy.mock.calls.map((call) => call[0]).filter((args) => !typeOfUser || args.typeOfUser === typeOfUser);

    return calls[calls.length - 1]?.enabled;
};

const enabledFlags = () => ({
    tenants: lastEnabled(mocks.tenants),
    agencies: lastEnabled(mocks.agencies),
    topics: lastEnabled(mocks.topics),
    consultants: lastEnabled(mocks.accounts, TypeOfUser.Consultants),
    agencyAdmins: lastEnabled(mocks.accounts, TypeOfUser.AgencyAdmins),
    tenantAdmins: lastEnabled(mocks.accounts, TypeOfUser.TenantAdmins),
});

const typed = async (text: string) => {
    const view = renderHook(({ query }) => useSearchEntities(query), { initialProps: { query: '' } });

    view.rerender({ query: text });
    await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
    });

    return view;
};

beforeEach(() => {
    vi.useFakeTimers();
    Object.values(mocks).forEach((value) => {
        if (typeof value === 'function') {
            value.mockReset().mockReturnValue(quiet);
        }
    });
    mocks.denied.clear();
    mocks.asked.length = 0;
    mocks.superAdmin = true;
});

afterEach(() => {
    vi.useRealTimers();
});

describe('useSearchEntities: which lists are asked for what is typed', () => {
    it('asks every list when the admin may read all of them', async () => {
        await typed('anna');

        expect(enabledFlags()).toEqual({
            tenants: true,
            agencies: true,
            topics: true,
            consultants: true,
            agencyAdmins: true,
            tenantAdmins: true,
        });
    });

    it('asks nothing below two characters, however much the admin may read', async () => {
        await typed('a');

        expect(Object.values(enabledFlags()).every((flag) => flag === false)).toBe(true);
    });

    it.each([
        ['tenants', Resource.Tenant],
        ['agencies', Resource.Agency],
        ['topics', Resource.Topic],
        ['consultants', Resource.Consultant],
        ['agencyAdmins', Resource.AgencyAdminUser],
        ['tenantAdmins', Resource.TenantAdminUser],
    ] as const)('does not ask the %s list without its permission', async (list, resource) => {
        mocks.denied.add(resource);

        await typed('anna');

        const flags = enabledFlags();

        expect(flags[list]).toBe(false);
        expect(
            Object.entries(flags)
                .filter(([name]) => name !== list)
                .every(([, flag]) => flag === true),
        ).toBe(true);
    });

    it('never asks the tenant list for an admin who is not a platform admin', async () => {
        mocks.superAdmin = false;

        await typed('anna');

        expect(enabledFlags().tenants).toBe(false);
        expect(enabledFlags().agencies).toBe(true);
    });

    it('asks for the permission the page behind each list needs', async () => {
        await typed('anna');

        const asked = (resource: string) =>
            mocks.asked.filter(([, name]) => name === resource).map(([action]) => action);

        expect(asked(Resource.Tenant)).toContain(PermissionAction.Create);
        expect(asked(Resource.Agency)).toContain(PermissionAction.Read);
        expect(asked(Resource.Topic)).toContain(PermissionAction.Read);
        expect(asked(Resource.Consultant)).toContain(PermissionAction.Read);
        expect(asked(Resource.AgencyAdminUser)).toContain(PermissionAction.Read);
        expect(asked(Resource.TenantAdminUser)).toContain(PermissionAction.Read);
    });

    it('hands the released search text to the lists', async () => {
        await typed('anna');

        expect(mocks.agencies.mock.calls.at(-1)?.[0].search).toBe('anna');
        expect(mocks.tenants.mock.calls.at(-1)?.[0].search).toBe('anna');
    });
});

describe('useSearchEntities: a failed list is reported', () => {
    // Without the opt-in the account lists resolve a failed request to an empty list and `isError` stays false.
    it.each([TypeOfUser.Consultants, TypeOfUser.AgencyAdmins, TypeOfUser.TenantAdmins])(
        'asks the %s list to reject when its request fails',
        async (typeOfUser) => {
            await typed('anna');

            const calls = mocks.accounts.mock.calls
                .map((call) => call[0])
                .filter((args) => args.typeOfUser === typeOfUser);

            expect(calls.length).toBeGreaterThan(0);
            expect(calls.every((args) => args.rethrowOnFailure === true)).toBe(true);
        },
    );

    it('flags an error of an account list', async () => {
        mocks.accounts.mockReturnValue({ ...quiet, isError: true });

        const { result } = await typed('anna');

        expect(result.current.hasError).toBe(true);
    });

    it('flags an error of a list that was asked for', async () => {
        mocks.agencies.mockReturnValue({ ...quiet, isError: true });

        const { result } = await typed('anna');

        expect(result.current.hasError).toBe(true);
    });

    it('does not flag anything below the minimum length', async () => {
        mocks.agencies.mockReturnValue({ ...quiet, isError: true });

        const { result } = await typed('a');

        expect(result.current.hasError).toBe(false);
    });

    it('reports the query its rows belong to', async () => {
        const { result } = await typed('anna');

        expect(result.current.forQuery).toBe('anna');
    });
});
