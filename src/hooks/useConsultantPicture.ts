import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getConsultantPicture,
    getConsultantPictureVisibility,
    removeConsultantPicture,
    setConsultantPictureVisibility,
    uploadConsultantPicture,
} from '../api/counselor/consultantPicture';

export const consultantPictureKey = (consultantId: string) => ['CONSULTANT_PICTURE', consultantId] as const;
export const consultantPictureVisibilityKey = (consultantId: string) =>
    ['CONSULTANT_PICTURE_VISIBILITY', consultantId] as const;

/** The stored photo bytes (`null` = no photo). Never an `<img src>` URL: the route needs a bearer token. */
export const useConsultantPicture = (consultantId?: string) =>
    useQuery({
        queryKey: consultantPictureKey(consultantId ?? ''),
        queryFn: ({ signal }) => getConsultantPicture(consultantId as string, signal),
        enabled: !!consultantId,
        retry: false,
    });

/** The publish decision; only meaningful once a photo exists. Unknown reads as internal only. */
export const useConsultantPictureVisibility = (consultantId: string | undefined, enabled: boolean) =>
    useQuery({
        queryKey: consultantPictureVisibilityKey(consultantId ?? ''),
        queryFn: ({ signal }) => getConsultantPictureVisibility(consultantId as string, signal),
        enabled: enabled && !!consultantId,
        retry: false,
    });

/**
 * Upload, remove and publish. Each mutation takes the consultant id as its variable, so a request
 * can never go to `/undefined/picture`, and a late result still refreshes the consultant it was for.
 * After every write the stored state is read back: the UI shows what the server holds, not a guess.
 */
export const useConsultantPictureMutations = () => {
    const queryClient = useQueryClient();
    const readBack = (id: string) =>
        Promise.all([
            queryClient.invalidateQueries({ queryKey: consultantPictureKey(id), exact: true }),
            queryClient.invalidateQueries({ queryKey: consultantPictureVisibilityKey(id), exact: true }),
        ]);
    // A read still in flight from before the write must not paint the old photo afterwards.
    const cancelReads = (id: string) => queryClient.cancelQueries({ queryKey: consultantPictureKey(id), exact: true });

    const upload = useMutation({
        mutationFn: ({ id, picture }: { id: string; picture: File }) => uploadConsultantPicture(id, picture),
        onMutate: ({ id }) => cancelReads(id),
        onSettled: (_data, _error, { id }) => readBack(id),
    });
    const remove = useMutation({
        mutationFn: ({ id }: { id: string }) => removeConsultantPicture(id),
        onMutate: ({ id }) => cancelReads(id),
        onSuccess: (_data, { id }) => queryClient.setQueryData(consultantPictureKey(id), null),
        onSettled: (_data, _error, { id }) => readBack(id),
    });
    const publish = useMutation({
        mutationFn: ({ id, internalOnly }: { id: string; internalOnly: boolean }) =>
            setConsultantPictureVisibility(id, internalOnly),
        onSettled: (_data, _error, { id }) =>
            queryClient.invalidateQueries({ queryKey: consultantPictureVisibilityKey(id), exact: true }),
    });

    return { upload, remove, publish };
};
