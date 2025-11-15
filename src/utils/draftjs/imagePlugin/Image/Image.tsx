import React, { ComponentType, ReactNode, useEffect } from 'react';
import { ContentState, Entity } from 'draft-js';

export interface ComponentProps {
    children: ReactNode;
    href: string;
    target: string;
    rel: string;
    className: string;
}

export interface ImageProps {
    decoratedText?: string;
    component?: ComponentType<ComponentProps>;
    children: ReactNode;
    target?: string;
    rel?: string;
    className?: string;
    // following props are not used
    entityKey?: string;
    getEditorState?: unknown;
    offsetKey?: unknown;
    setEditorState?: unknown;
    contentState?: ContentState;
    blockKey?: unknown;
    dir?: unknown;
    start?: unknown;
    end?: unknown;
}

// The component we render when we encounter a link in the text
const ImageComponent = (props: ImageProps) => {
    const { height, src, width } = props.contentState.getEntity(props.entityKey).getData();

    useEffect(() => {
        const image = new Image();
        image.src = src;
        image.onload = () => {
            if (width === null || height === null) {
                Entity.mergeData(props.entityKey, {
                    width: image.width,
                    height: image.height,
                    originalWidth: image.width,
                    originalHeight: image.height,
                });
            }
        };
    }, [src, width, height]);

    return <img src={src} height={height} width={width} alt="test" />;
};
export default ImageComponent;
