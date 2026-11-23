export interface TourLauncherVisibilityInput {
    /** Central `enableWalkthrough`; unknown counts as on, like the profile tour card. */
    centralToursEnabled?: boolean;
    /** Per-user "Rundgang-Knopf anzeigen" switch on the profile tour card. */
    userSwitchOn: boolean;
    /** A tour is running: the launcher must not sit on top of it. */
    tourRunning: boolean;
    /** Tours available to the signed-in admin's audience. */
    availableTourCount: number;
}

/** The single visibility rule of the "?" tour launcher. */
export const shouldShowTourLauncher = ({
    centralToursEnabled,
    userSwitchOn,
    tourRunning,
    availableTourCount,
}: TourLauncherVisibilityInput): boolean =>
    centralToursEnabled !== false && userSwitchOn && !tourRunning && availableTourCount > 0;
