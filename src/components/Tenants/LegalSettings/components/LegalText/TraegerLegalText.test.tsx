import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TraegerLegalText } from './TraegerLegalText';

const state = vi.hoisted(() => ({ isTenantScopedAdmin: false, requestedTenantId: '' }));

vi.mock('../../../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => state }));
vi.mock('../../hooks/useLegalProposalInbox', () => ({
    useTenantLegalProposalInbox: (tenantId: number | string) => {
        state.requestedTenantId = String(tenantId);
        return { state: 'available' };
    },
}));
vi.mock('./index', () => ({
    LegalText: ({
        offerTemplatesToAgencies,
        templateCanManage,
    }: {
        offerTemplatesToAgencies: boolean;
        templateCanManage: boolean;
    }) => (
        <output data-testid="permissions">
            {String(offerTemplatesToAgencies)}:{String(templateCanManage)}
        </output>
    ),
}));

const props = {
    tenantId: 17,
    fieldName: ['content', 'impressum'],
    titleKey: 'imprint.title',
    legalType: 'imprint' as const,
    placeHolderKey: 'settings.imprint.placeholder',
};

describe('TraegerLegalText inspected by different admins', () => {
    beforeEach(() => {
        state.isTenantScopedAdmin = false;
        state.requestedTenantId = '';
    });

    it('loads the target inbox without allowing the platform admin to act for its recipient', () => {
        render(<TraegerLegalText {...props} />);
        expect(state.requestedTenantId).toBe('17');
        expect(screen.getByTestId('permissions')).toHaveTextContent('false:false');
    });

    it('keeps forwarding and recipient decisions available to the Träger admin', () => {
        state.isTenantScopedAdmin = true;
        render(<TraegerLegalText {...props} />);
        expect(screen.getByTestId('permissions')).toHaveTextContent('true:true');
    });
});
