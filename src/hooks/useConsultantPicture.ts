import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getConsultantPicture,
    getConsultantPictureVisibility,
    removeConsultantPicture,
    setConsultantPictureVisibility,
    uploadConsultantPicture,
} from '../api/counselor/consultantPicture';

const pictureKey = (consultantId?: string) => ['CONSULTANT_PICTURE', consultantId] as const;
const visibilityKey = (consultantId?: string) => ['CONSULTANT_PICTURE_VISIBILITY', consultantId] as const;

export const useConsultantPicture = (consultantId?: string) =>
    useQuery({
        queryKey: pictureKey(consultantId),
        queryFn: ({ signal }) => getConsultantPicture(consultantId as string, signal),
        enabled: !!consultantId && consultantId !== 'add',
        retry: false,
    });

/**
 * Issue #1049: the publish decision for a stored picture. It is only meaningful once a picture
 * exists, so the caller enables it accordingly; the safe default while unknown is internal only.
 */
export const useConsultantPictureVisibility = (consultantId?: string, enabled = true) =>
    useQuery({
        queryKey: visibilityKey(consultantId),
        queryFn: ({ signal }) => getConsultantPictureVisibility(consultantId as string, signal),
        enabled: enabled && !!consultantId && consultantId !== 'add',
        retry: false,
    });

export const useConsultantPictureMutations = (consultantId?: string) => {
    const queryClient = useQueryClient();
    const cancelReads = (id: string) => queryClient.cancelQueries({ queryKey: pictureKey(id), exact: true });
    const refresh = async (id: string) => {
        // An initial read with no data is reused by invalidateQueries in Query v5. Cancel it
        // explicitly, including any read started during the mutation, before obtaining fresh bytes.
        await cancelReads(id);
        await Promise.all([
            queryClient
                .fetchQuery({
                    queryKey: pictureKey(id),
                    queryFn: ({ signal }) => getConsultantPicture(id, signal),
                    staleTime: 0,
                    retry: false,
                })
                .catch((error) => {
                    // The write succeeded. Query owns this read error and the control displays it.
                    // Do not turn it into a write refusal or suppress failures outside that read.
                    if (queryClient.getQueryState(pictureKey(id))?.error !== error) throw error;
                }),
            queryClient.invalidateQueries({ queryKey: visibilityKey(id), exact: true }),
            queryClient.invalidateQueries({ queryKey: ['CONSULTANT', id] }),
            queryClient.invalidateQueries({ queryKey: ['CONSULTANTS'] }),
        ]);
    };

    // Mutation variables retain the target across observer/route changes while a request is pending.
    const upload = useMutation({
        mutationFn: ({ id, picture }: { id: string; picture: File }) => uploadConsultantPicture(id, picture),
        onMutate: ({ id }) => cancelReads(id),
        onSuccess: (_, { id }) => refresh(id),
        onError: (_, { id }) => queryClient.invalidateQueries({ queryKey: pictureKey(id), exact: true }),
    });
    const remove = useMutation({
        mutationFn: (id: string) => removeConsultantPicture(id),
        onMutate: cancelReads,
        onError: (_, id) => queryClient.invalidateQueries({ queryKey: pictureKey(id), exact: true }),
        onSuccess: async (_, id) => {
            queryClient.setQueryData(pictureKey(id), null);
            await refresh(id);
        },
    });

    // Publishing and withdrawing are their own operation: the bytes are untouched, only the flag
    // moves. A successful write refetches the flag so the switch always shows the stored truth.
    const publish = useMutation({
        mutationFn: ({ id, internalOnly }: { id: string; internalOnly: boolean }) =>
            setConsultantPictureVisibility(id, internalOnly),
        onSettled: (_data, _error, { id }) =>
            queryClient.invalidateQueries({ queryKey: visibilityKey(id), exact: true }),
    });

    return {
        publish: {
            isPending: publish.isPending,
            mutateAsync: (internalOnly: boolean) => publish.mutateAsync({ id: consultantId as string, internalOnly }),
        },
        upload: {
            isPending: upload.isPending,
            mutateAsync: (picture: File) => upload.mutateAsync({ id: consultantId as string, picture }),
        },
        remove: {
            isPending: remove.isPending,
            mutateAsync: () => remove.mutateAsync(consultantId as string),
        },
    };
};
