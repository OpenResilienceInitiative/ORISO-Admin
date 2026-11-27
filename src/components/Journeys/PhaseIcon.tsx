import FlightTakeoff from '@mui/icons-material/FlightTakeoff';
import Flight from '@mui/icons-material/Flight';
import FlightLand from '@mui/icons-material/FlightLand';
import type { JourneyPhase } from './journey';

/** The plane in three positions: taking off, in the air, landing. */
export const PhaseIcon = ({ phase }: { phase: JourneyPhase }) => {
    if (phase === 'departure') return <FlightTakeoff />;
    if (phase === 'arrival') return <FlightLand />;
    return <Flight style={{ transform: 'rotate(90deg)' }} />;
};
