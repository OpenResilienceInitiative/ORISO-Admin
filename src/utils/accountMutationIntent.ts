import { AccountOperationActions, AccountOperationIntent } from './accountOperationIntent';

export interface AccountOperationVariables {
    operationIntent?: AccountOperationIntent;
}

/** Prepare at mutate()/mutateAsync(), before React Query can run or retry mutationFn. */
export const bindAccountOperationMutation =
    <T extends object, R, O>(
        actions: AccountOperationActions,
        operation: string,
        target: string,
        mutate: (variables: T & AccountOperationVariables, options?: O) => R,
        materialize?: (variables: T) => T,
    ) =>
    (variables: T, options?: O): R => {
        const submitted = { ...variables };
        delete (submitted as T & AccountOperationVariables).operationIntent;
        const attempt = actions.prepare(operation, target, submitted, materialize);
        return mutate({ ...attempt.payload, operationIntent: attempt.intent }, options);
    };
