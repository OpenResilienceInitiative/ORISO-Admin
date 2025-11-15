import { TopicData } from './topic';

export interface TopicAdminData extends Omit<TopicData, 'name' | 'description'> {
    id: number | null;
    name: Record<string, string>;
    description: Record<string, string>;
    internalIdentifier: string | null;
    status: string | undefined;
}
