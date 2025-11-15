import { useQuery, UseQueryOptions } from 'react-query';
import { getUserData } from '../api/user/getUserData';

export const USER_DATA_KEY = 'user-data';
export const useUserData = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) =>
    useQuery<any>(USER_DATA_KEY, () => getUserData(), options);
