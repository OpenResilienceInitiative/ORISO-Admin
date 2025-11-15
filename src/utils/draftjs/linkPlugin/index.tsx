import React, { ReactElement } from 'react';
import { EditorPlugin } from '@draft-js-plugins/editor';
import Link, { LinkProps } from './Link/Link';
import linkStrategy from './linkStrategy';

export * from './Control/Link';

export interface LinkPluginConfig {
    target?: string;
    rel?: string;
}

export default (config: LinkPluginConfig = {}): EditorPlugin => {
    const { target = '_self', rel = 'noreferrer noopener' } = config;

    const DecoratedLink = ({ children, ...props }: LinkProps): ReactElement => (
        <Link {...props} target={target} rel={rel}>
            {children}
        </Link>
    );

    return {
        decorators: [
            {
                strategy: linkStrategy,
                component: DecoratedLink,
            },
        ],
    };
};
