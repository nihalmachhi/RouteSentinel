/**
 * WHAT YOU WILL LEARN
 * - Why native <details> is better than a custom disclosure for the FAQ.
 * - How to test the nine questions without snapshotting markup.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Faq } from '../components/Faq';
import { FAQ } from '../data/content';

describe('FAQ', () => {
  it('renders nine details items', () => {
    const { container } = render(<Faq />);
    expect(container.querySelectorAll('details')).toHaveLength(9);
    expect(screen.getAllByText(/.+/, { selector: 'summary' })).toHaveLength(FAQ.length);
  });

  it('opens and closes a question with a native details toggle', () => {
    const { container } = render(<Faq />);
    const first = container.querySelector('details');
    expect(first).not.toBeNull();
    expect(first?.open).toBe(false);

    fireEvent.click(first?.querySelector('summary') as Element);
    expect(first?.open).toBe(true);

    fireEvent.click(first?.querySelector('summary') as Element);
    expect(first?.open).toBe(false);
  });

  it('shows the honest answer about IPv6', () => {
    render(<Faq />);
    expect(screen.getByText('Is IPv6 supported?')).toBeInTheDocument();
    expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();
  });
});
