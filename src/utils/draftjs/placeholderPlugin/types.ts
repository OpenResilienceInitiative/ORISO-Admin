import { ComponentType, Ref } from 'react';
import { EditorRef } from '@draft-js-plugins/editor';
import { EditorState } from 'draft-js';

export interface PlaceholderPluginConfig {
    placeholders?: { [key: string]: string };
}

export interface PlaceholderPluginStore {
    getEditorRef?(): EditorRef;
    getReadOnly?(): boolean;
    getEditorState?(): EditorState;
    setEditorState?(state: EditorState): void;
    getProps?(): any;
}

export interface BlockProps {
    setResizeData(value: { width: number; height: number }): void;
    resizeData: { width: number; height: number };
}

export interface DecoratorProps {
    config: PlaceholderPluginConfig;
    store: PlaceholderPluginStore;
}

export interface WrappedComponentProps {
    blockProps: BlockProps;
    ref?: Ref<HTMLElement>;
}

export interface BlockPlaceholderDecoratorProps extends WrappedComponentProps {
    isResizable?: boolean;
    resizeSteps?: number;
}

export type WrappedComponentType = ComponentType<WrappedComponentProps> & {
    WrappedComponent?: ComponentType<WrappedComponentProps>;
};
