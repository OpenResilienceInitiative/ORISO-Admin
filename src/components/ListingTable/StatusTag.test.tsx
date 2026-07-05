import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnonymityTag, StatusTag } from './StatusTag';

describe('Listing table tags', () => {
    it('renders invite link status text', () => {
        render(<StatusTag status="ACTIVE" />);

        expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });

    it('renders anonymity labels with their original text', () => {
        render(<AnonymityTag value="Name + Email" />);

        expect(screen.getByText('Name + Email')).toBeInTheDocument();
    });
});
