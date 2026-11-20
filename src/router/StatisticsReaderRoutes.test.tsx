import { describe, expect, it } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import routePathNames from '../appConfig';
import { StatisticsReaderRoutes } from './StatisticsReaderRoutes';

const CurrentPath = () => <output aria-label="path">{useLocation().pathname}</output>;

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <StatisticsReaderRoutes statistic={<div>statistic-page</div>} profile={<div>profile-page</div>} />
            <CurrentPath />
        </MemoryRouter>,
    );

describe('StatisticsReaderRoutes (ORISO-UserService#1666)', () => {
    it('renders the statistics page', () => {
        renderAt(routePathNames.statistic);

        expect(screen.getByText('statistic-page')).toBeInTheDocument();
    });

    it('keeps the own profile reachable for password and 2FA', () => {
        renderAt(routePathNames.userProfile);

        expect(screen.getByText('profile-page')).toBeInTheDocument();
    });

    it.each([
        routePathNames.root,
        routePathNames.home,
        routePathNames.agency,
        `${routePathNames.agency}/12/general`,
        routePathNames.users,
        routePathNames.tenantAdmins,
        '/admin/users/statistics-readers/add',
        `${routePathNames.tenants}/3/general`,
        `${routePathNames.themeSettings}/global-config`,
        routePathNames.logs,
        routePathNames.links,
        routePathNames.topics,
        routePathNames.statisticPreview,
        '/admin/unknown',
    ])('sends %s to the statistics page', (path) => {
        renderAt(path);

        expect(screen.getByText('statistic-page')).toBeInTheDocument();
        expect(screen.getByLabelText('path')).toHaveTextContent(routePathNames.statistic);
    });
});
