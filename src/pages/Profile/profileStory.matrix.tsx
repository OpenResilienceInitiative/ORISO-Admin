import type { Decorator } from '@storybook/react-vite';
import { CardGrid } from '../../components/CardGrid';
import { setSessionTokens } from '../../api/auth/tokenSessionStore';

const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** An unsigned token carrying only the realm roles, which is all the Mein Account tiles read from it. */
export const withRoles =
    (roles: string[]): Decorator =>
    (Story) => {
        setSessionTokens(`${encode({ alg: 'none' })}.${encode({ realm_access: { roles } })}.x`, 'refresh');
        return Story();
    };

/** One tile as it sits on the page, next to a tall neighbour, so the use of the free space shows. */
export const inTheRaster = (render: () => React.ReactNode) => (
    <CardGrid raster>
        <CardGrid.Item>{render()}</CardGrid.Item>
        <CardGrid.Item>
            <div style={{ height: 520 }} />
        </CardGrid.Item>
    </CardGrid>
);
