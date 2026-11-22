import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import routePathNames from '../appConfig';

interface StatisticsReaderRoutesProps {
    statistic: ReactNode;
    profile: ReactNode;
}

/**
 * The whole route table of a Statistik-Leser·in (ORISO-UserService#1666): statistics and the
 * own profile (password, 2FA). Every other admin address — Home, Träger, Beratungsstellen,
 * users, settings, logs, links — lands on statistics instead of an access-denied page, so an
 * old bookmark or the login redirect never strands the reader.
 */
export const StatisticsReaderRoutes = ({ statistic, profile }: StatisticsReaderRoutesProps) => (
    <Routes>
        <Route path={routePathNames.statistic} element={statistic} />
        <Route path={routePathNames.userProfile} element={profile} />
        <Route path="*" element={<Navigate to={routePathNames.statistic} replace />} />
    </Routes>
);
