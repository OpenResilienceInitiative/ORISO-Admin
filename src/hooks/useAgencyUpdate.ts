import mergeWith from 'lodash.mergewith';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import addAgencyData from '../api/agency/addAgencyData';
import { updateAgencyData } from '../api/agency/updateAgencyData';
import { TypeOfUser } from '../enums/TypeOfUser';
import { AgencyData } from '../types/agency';
import { useAgencyData } from './useAgencyData';
import { AGENCY_CONSULTANTS_KEY } from './useAgencyConsultants';

export const useAgencyUpdate = (id: string) => {
    const queryClient = useQueryClient();
    const { data: agencyData } = useAgencyData({ id, enabled: id !== 'add' });
    return useMutation({
        // Every update sends a merged agency snapshot. Queue updates for this agency so an
        // overlapping card save starts from the last confirmed snapshot rather than racing an
        // older full payload over it.
        scope: { id: `agency-update-${id}` },
        mutationFn: async (data: Partial<AgencyData>) => {
            if (id === 'add') {
                return addAgencyData(data);
            }
            await queryClient.cancelQueries({ queryKey: ['AGENCY', id] });
            const latestAgencyData = queryClient.getQueryData<AgencyData>(['AGENCY', id]) ?? agencyData;
            const mergedAgencyData = mergeWith({}, latestAgencyData, data, (objValue, srcValue) => {
                return objValue instanceof Array ? srcValue : undefined;
            }) as AgencyData;

            // Geographic coverage belongs to this card submission, not the merged agency
            // snapshot. Do not replay a previous registration save during a delayed refetch.
            mergedAgencyData.postCodes = data.postCodes;
            mergedAgencyData.postCodeRangesActive = data.postCodeRangesActive;

            // These language maps are complete legal-document snapshots. Deep-merging them would
            // resurrect a removed language (and turn an explicit empty consent map back into the
            // previously published wording). Replace only maps that the narrow patch supplied;
            // sibling content fields keep the regular partial-card merge semantics above.
            if (data.content) {
                const mergedContent = mergedAgencyData.content ?? {};
                if (data.content.privacy !== undefined) {
                    mergedContent.privacy = { ...data.content.privacy };
                }
                if (data.content.impressum !== undefined) {
                    mergedContent.impressum = { ...data.content.impressum };
                }
                if (data.content.privacyConsent !== undefined) {
                    mergedContent.privacyConsent = { ...data.content.privacyConsent };
                }
                mergedAgencyData.content = mergedContent;
            }

            // Switching the centre offline must not echo the stored data protection contact:
            // AgencyService validates any contact it receives and rejected an incomplete stored one,
            // so the centre could not be paused (#1243). Omitted, the service keeps the stored
            // contact. Going online still sends it, so the service keeps checking it there.
            const requestData =
                data.online === false && data.dataProtection === undefined
                    ? { ...mergedAgencyData, dataProtection: undefined }
                    : mergedAgencyData;

            // Cache the accepted main write at once so a queued save uses what the server holds.
            const response = await updateAgencyData(latestAgencyData, requestData, (saved) => {
                if (saved) queryClient.setQueryData(['AGENCY', id], saved);
            });

            // Cache only a confirmed write. A rejected legal publication must not enter the base
            // of a later unrelated card update and get published by that second request.
            await queryClient.cancelQueries({ queryKey: ['AGENCY', id] });
            queryClient.setQueryData(['AGENCY', id], response);
            return response;
        },
        // Preparation writes (coverage or counsellor assignment) may succeed before the main PUT
        // fails. Reload so the next card save uses the server's confirmed state.
        // Returned so the mutation settles only after the refetch: a queued save must not merge into
        // the old snapshot in between.
        onError: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: ['AGENCY', id] }),
                queryClient.invalidateQueries({ queryKey: ['AGENCY_POST_CODES', id] }),
            ]),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['AGENCY', id] });
            queryClient.invalidateQueries({ queryKey: ['AGENCIES'] });
            queryClient.invalidateQueries({ queryKey: ['AGENCY_POST_CODES', id] });

            if ((variables as Partial<AgencyData>)?.consultantIds?.length > 0) {
                queryClient.invalidateQueries({ queryKey: ['HAS_CONSULTANTS'] });
                queryClient.invalidateQueries({ queryKey: [AGENCY_CONSULTANTS_KEY, id] });
                queryClient.invalidateQueries({ queryKey: [TypeOfUser.Consultants.toUpperCase()] });
            }
        },
    });
};
