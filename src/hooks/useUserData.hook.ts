import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getUserData } from '../api/user/getUserData';

export const USER_DATA_KEY = 'user-data';
export const useUserData = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) =>
    useQuery<any>({ queryKey: [USER_DATA_KEY], queryFn: () => getUserData(), ...options });
