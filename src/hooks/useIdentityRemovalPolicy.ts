import { useUserData } from './useUserData.hook';

/** Availability is server-reported; it grants no permission to the caller. */
export const useIdentityRemovalPolicy = (target: string, administrator: boolean, hasOtherIdentity?: boolean) => {
    const { data } = useUserData();
    const scoped = data?.scopedAccountCommands;
    let unavailableReason: string | undefined;
    if (administrator && data?.userId === target) {
        unavailableReason = 'identityRemoval.selfAdministrator';
    } else if ((scoped !== true && scoped !== false) || (administrator && !data?.userId)) {
        unavailableReason = 'identityRemoval.checkingAvailability';
    } else if (scoped === false && hasOtherIdentity === true) {
        unavailableReason = 'identityRemoval.unavailable';
    }
    return { scoped: scoped === true, unavailableReason };
};
