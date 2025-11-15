import React, { ReactNode } from 'react';

export interface ComponentProps {
    children: ReactNode;
    href: string;
    target: string;
    rel: string;
    className: string;
}

export interface LinkProps {
    children: ReactNode;
    target?: string;
    rel?: string;
    url?: string;
}

// The component we render when we encounter a link in the text
const Link = ({ children, target, rel, url }: LinkProps) => {
    return (
        <a href={url} rel={rel} target={target}>
            {children}
        </a>
    );
};
export default Link;
