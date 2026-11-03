import { useQuery } from '@tanstack/react-query';
import { getErstantwortDefaults } from '../api/erstantwort/getErstantwortDefaults';
import type { ErstantwortBausteinKey } from '../components/Tenants/AppSettings/ErstantwortSettings/erstantwortBausteine';

export const ERSTANTWORT_DEFAULTS_QUERY_KEY = 'ERSTANTWORT_DEFAULTS';

export interface ErstantwortPlatformDefaults {
    texts: Partial<Record<ErstantwortBausteinKey, string>>;
    emergencyNumbers?: string;
}

/** Platform texts for the German variant; stays `undefined` when the endpoint fails, so the card says "not loaded". */
export const useErstantwortDefaults = (informal: boolean) =>
    useQuery({
        queryKey: [ERSTANTWORT_DEFAULTS_QUERY_KEY, informal],
        queryFn: () => getErstantwortDefaults(informal),
        staleTime: 5 * 60 * 1000,
        retry: false,
        select: (dto): ErstantwortPlatformDefaults => ({
            texts: {
                ...(dto.greeting ? { erstantwortGreeting: dto.greeting } : {}),
                ...(dto.whoReadsAlong ? { erstantwortWhoReadsAlong: dto.whoReadsAlong } : {}),
                ...(dto.closing ? { erstantwortClosing: dto.closing } : {}),
            },
            emergencyNumbers: dto.emergencyNumbers,
        }),
    });
