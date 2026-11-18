/**
 * WHAT YOU WILL LEARN
 * - How the tour advances from a CSS animation event rather than a timer.
 * - Why hover, focus and the pause button all suspend the same hold flag.
 * - How reduced motion removes the auto-advance and the fade.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';

function activeTab() {
  return screen.getAllByRole('tab').find((tab) => tab.getAttribute('aria-selected') === 'true');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tour', () => {
  it('renders five tabs and starts on Ingest', () => {
    render(<App />);
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(activeTab()).toHaveTextContent('Ingest');
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('advances when the progress bar animation ends', async () => {
    render(<App />);
    const bar = document.querySelector('.tab[aria-selected="true"] .bar');
    expect(bar).not.toBeNull();
    fireEvent.animationEnd(bar as Element);
    await waitFor(() => expect(activeTab()).toHaveTextContent('Match'), { timeout: 1000 });
  });

  it('pauses while the pointer is over the window', async () => {
    render(<App />);
    const win = document.querySelector('.win');
    expect(win).not.toBeNull();
    fireEvent.mouseEnter(win as Element);
    expect(document.querySelector('.hero')).toHaveClass('hold');
    fireEvent.animationEnd(document.querySelector('.bar') as Element);
    await new Promise((resolve) => setTimeout(resolve, 320));
    expect(activeTab()).toHaveTextContent('Ingest');
  });

  it('pauses while focus is inside the tab list', async () => {
    render(<App />);
    const tabs = screen.getAllByRole('tab');
    fireEvent.focus(tabs[1] as Element);
    expect(document.querySelector('.hero')).toHaveClass('hold');
    fireEvent.animationEnd(document.querySelector('.bar') as Element);
    await new Promise((resolve) => setTimeout(resolve, 320));
    expect(activeTab()).toHaveTextContent('Ingest');
  });

  it('pauses from the control button and swaps its label', async () => {
    const user = userEvent.setup();
    render(<App />);
    const control = screen.getByRole('button', { name: 'Pause the automatic tour' });
    await user.click(control);
    expect(control).toHaveAccessibleName('Resume the automatic tour');
    expect(document.querySelector('.hero')).toHaveClass('hold');
    fireEvent.animationEnd(document.querySelector('.bar') as Element);
    await new Promise((resolve) => setTimeout(resolve, 320));
    expect(activeTab()).toHaveTextContent('Ingest');
  });

  it('moves selection with ArrowRight, Home and End', async () => {
    render(<App />);
    const tabs = screen.getAllByRole('tab');
    const tablist = tabs[0]?.parentElement;
    expect(tablist).not.toBeNull();

    fireEvent.keyDown(tablist as Element, { key: 'ArrowRight' });
    await waitFor(() => expect(activeTab()).toHaveTextContent('Match'));
    expect(document.activeElement).toBe(tabs[1]);

    fireEvent.keyDown(tablist as Element, { key: 'End' });
    await waitFor(() => expect(activeTab()).toHaveTextContent('Review'));

    fireEvent.keyDown(tablist as Element, { key: 'Home' });
    await waitFor(() => expect(activeTab()).toHaveTextContent('Ingest'));

    fireEvent.keyDown(tablist as Element, { key: 'ArrowLeft' });
    await waitFor(() => expect(activeTab()).toHaveTextContent('Review'));
  });

  it('skips the fade and auto-advance under reduced motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('tab', { name: 'Match' }));
    expect(activeTab()).toHaveTextContent('Match');

    fireEvent.animationEnd(document.querySelector('.bar') as Element);
    await new Promise((resolve) => setTimeout(resolve, 320));
    expect(activeTab()).toHaveTextContent('Match');
  });

  it('renders the alert tab evidence and the review tab note', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('tab', { name: 'Alert' }));
    expect(screen.getByText('unexpected-subprefix · high')).toBeInTheDocument();
    expect(screen.getAllByText(/203\.0\.113\.128\/25/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('tab', { name: 'Review' }));
    expect(screen.getByText('true_positive')).toBeInTheDocument();
    expect(screen.getByText(/Stored, not yet used/)).toBeInTheDocument();
  });
});
