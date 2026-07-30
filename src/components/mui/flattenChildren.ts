import * as React from 'react';

/**
 * `React.Children.toArray` flattens arrays but stops at a Fragment, so
 * `<><Option/><Option/></>` arrives as a single node. The `.Option` / `.Radio`
 * child APIs read props off each declared option, so descend through fragments
 * first and return only the real elements.
 */
export const flattenChildren = (children: React.ReactNode): React.ReactElement[] =>
    React.Children.toArray(children).flatMap((child) => {
        if (!React.isValidElement(child)) {
            return [];
        }
        if (child.type === React.Fragment) {
            return flattenChildren((child.props as { children?: React.ReactNode }).children);
        }
        return [child];
    });

export default flattenChildren;
