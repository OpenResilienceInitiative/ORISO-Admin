import type { DpiaMasterData, DpiaKeyFigureName } from '../../types/dpiaMasterData';
import type { KeyFigure } from './dpiaContent';
import { dpiaValue } from './DpiaChapterShared';

const labels: Record<DpiaKeyFigureName, string> = {
    tenants: 'Träger',
    counsellingCentres: 'Beratungsstellen',
    activeCounsellors: 'aktive Beratende',
    registeredClients: 'registrierte Ratsuchende',
};

/** No sample fallback: count zero is real, null and blank values remain visibly missing. */
export const toDpiaKeyFigures = (masterData?: DpiaMasterData | null): KeyFigure[] =>
    (Object.keys(labels) as DpiaKeyFigureName[]).map((name) => {
        const figure = masterData?.keyFigures?.[name];
        return {
            label: labels[name],
            value:
                typeof figure?.count === 'number' && Number.isFinite(figure.count)
                    ? figure.count.toLocaleString('de-DE')
                    : 'Nicht hinterlegt',
            asOfDate: dpiaValue(figure?.asOfDate),
        };
    });
