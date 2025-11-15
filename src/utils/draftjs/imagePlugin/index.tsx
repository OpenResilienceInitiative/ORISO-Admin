import React, { ComponentType, ReactElement } from 'react';
import { EditorPlugin } from '@draft-js-plugins/editor';
import Image, { ImageProps, ComponentProps } from './Image/Image';
import imageStrategy from './imageStrategy';

export * from './Control/Image';

export interface ImagePluginConfig {
    component?: ComponentType<ComponentProps>;
    target?: string;
    rel?: string;
}

export default (config: ImagePluginConfig = {}): EditorPlugin => {
    // Styles are overwritten instead of merged as merging causes a lot of confusion.

    // Why? Because when merging a developer needs to know all of the underlying
    // styles which needs a deep dive into the code. Merging also makes it prone to
    // errors when upgrading as basically every styling change would become a major
    // breaking change. 1px of an increased padding can break a whole layout.

    const { component, target = '_self', rel = 'noreferrer noopener' } = config;

    const DecoratedImage = ({ children, ...props }: ImageProps): ReactElement => (
        <Image {...props} target={target} rel={rel} component={component}>
            {children}
        </Image>
    );

    return {
        decorators: [
            {
                strategy: imageStrategy,
                component: DecoratedImage,
            },
        ],
    };
};
