export type ServerAppConfigInterface = {
    [key: string]: ServerAppConfigValueInterface;
} & ServerAppConfigCustomInterface;

interface ServerAppConfigCustomInterface {
    mainTenantSubdomainForSingleDomainMultitenancy?: ServerAppConfigValueInterface<string>;
    releaseToggles?: Record<string, boolean>;
}

interface ServerAppConfigValueInterface<T = boolean> {
    value: T;
    readOnly: boolean;
}
