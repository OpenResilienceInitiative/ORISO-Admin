import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect } from 'storybook/test';
import { MissingContactPersonTip } from './MissingContactPersonTip';
import { buildContactPersonTip, type ContactCoverageRow } from './contactPersonTip';
import type { HomeRole } from './homeModel';

/**
 * ORISO-Admin#1534: Home tip for centres without a contact person, per role. Rows are
 * shaped like `POST /useradmin/agencycontacts/coverage` joined with the centre and
 * Träger names Home already loads. Not placed on Home yet.
 */

const row = (
    agencyId: number,
    agencyName: string,
    covered: boolean,
    tenantName = 'Caritas Süd',
): ContactCoverageRow => ({
    agencyId,
    agencyName,
    covered,
    tenantId: tenantName.length,
    tenantName,
});

const Tip = ({ role, rows }: { role: HomeRole; rows: ContactCoverageRow[] }) => {
    const tip = buildContactPersonTip(role, rows);
    return (
        <div style={{ maxWidth: 640 }}>
            {tip ? (
                <MissingContactPersonTip tip={tip} />
            ) : (
                <p data-testid="no-tip" style={{ color: '#444748', fontSize: 14 }}>
                    Alle Beratungsstellen haben eine Ansprechperson — Home zeigt keinen Hinweis.
                </p>
            )}
        </div>
    );
};

const meta = {
    title: 'Home/Missing contact person tip',
    component: Tip,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Tip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** BST admin: their own centre has no contact person yet. */
export const AgencyAdmin: Story = {
    args: { role: 'agency', rows: [row(1, 'Beratungsstelle Nord', false)] },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('link', { name: /Beratungsstelle Nord/ })).toHaveAttribute(
            'href',
            '/admin/agency/1/general',
        );
    },
};

/** Träger admin: the uncovered centres as a list, each with a link to its edit page. */
export const TenantAdmin: Story = {
    args: {
        role: 'tenant',
        rows: [
            row(1, 'Beratungsstelle Nord', true),
            row(2, 'Suchtberatung Ost', false),
            row(3, 'Beratungsstelle Süd', false),
            row(4, 'Schuldnerberatung West', false),
        ],
    },
    play: async ({ canvas }) => {
        await expect(canvas.getAllByRole('link')).toHaveLength(3);
        await expect(canvas.getByRole('link', { name: /Suchtberatung Ost/ })).toHaveAttribute(
            'href',
            '/admin/agency/2/general',
        );
    },
};

/** Platform admin: a count per Träger, most first. */
export const PlatformAdmin: Story = {
    args: {
        role: 'platform',
        rows: [
            row(1, 'Nord', false, 'Caritas Süd'),
            row(2, 'Ost', false, 'Diakonie Mitte'),
            row(3, 'West', false, 'Diakonie Mitte'),
            row(4, 'Süd', true, 'Diakonie Mitte'),
            row(5, 'Mitte', false, 'Diakonie Mitte'),
        ],
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('3 Beratungsstellen')).toBeVisible();
        await expect(canvas.getByText('1 Beratungsstelle')).toBeVisible();
    },
};

/** Every centre is covered (own or Träger default): no tip at all. */
export const AllCovered: Story = {
    args: { role: 'tenant', rows: [row(1, 'Beratungsstelle Nord', true), row(2, 'Suchtberatung Ost', true)] },
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('region')).toBeNull();
        await expect(canvas.getByTestId('no-tip')).toBeVisible();
    },
};
