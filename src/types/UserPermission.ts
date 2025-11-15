import { Resource } from '../enums/Resource';

export type UserPermissions = {
    [key in keyof typeof Resource]?: UserPermission;
};

export interface UserPermission {
    read?: boolean;
    create?: boolean;
    update?: boolean;
    delete?: boolean;
}
