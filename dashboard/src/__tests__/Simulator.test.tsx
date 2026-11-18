/**
 * WHAT YOU WILL LEARN
 * - How a reducer keeps simulator state predictable.
 * - How the UI derives its verdict chip from the same engine the tests use.
 * - How the severity slider filters evidence without hiding the totals.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Simulator } from '../components/Simulator';

describe('simulator', () => {
  it('starts with no replay and an empty-state message', () => {
    render(<Simulator />);
    expect(screen.getByText('no replay yet')).toBeInTheDocument();
    expect(
      screen.getByText('Replay a feed, then pick an event to see why it alerted.'),
    ).toBeInTheDocument();
  });

  it('shows 8 alerts and 1 critical after replaying the incident feed', async () => {
    const user = userEvent.setup();
    render(<Simulator />);
    await user.click(screen.getByRole('button', { name: 'Replay incident feed' }));
    expect(screen.getByText('8 alerts · 1 critical')).toBeInTheDocument();
    expect(screen.getByText('8', { selector: '.stat b' })).toBeInTheDocument();
  });

  it('shows 0 alerts after replaying the clean feed', async () => {
    const user = userEvent.setup();
    render(<Simulator />);
    await user.click(screen.getByRole('button', { name: 'Replay clean feed' }));
    expect(screen.getByText('0 alerts')).toBeInTheDocument();
  });

  it('selects E4 and shows its three findings plus the evidence list', async () => {
    const user = userEvent.setup();
    render(<Simulator />);
    await user.click(screen.getByRole('button', { name: 'Replay incident feed' }));
    await user.click(screen.getByRole('button', { name: /E4/ }));

    expect(screen.getByText('unexpected-subprefix')).toBeInTheDocument();
    expect(screen.getByText('unexpected-origin')).toBeInTheDocument();
    expect(screen.getByText('rpki-unknown')).toBeInTheDocument();

    const evidence = screen.getByText('Matched asset').closest('dl');
    expect(evidence).not.toBeNull();
    expect(within(evidence as HTMLElement).getByText('203.0.113.0/24')).toBeInTheDocument();
    expect(within(evidence as HTMLElement).getByText('0.90')).toBeInTheDocument();
    expect(within(evidence as HTMLElement).getByText('AS64666')).toBeInTheDocument();
  });

  it('filters findings to critical and keeps E3 visible', async () => {
    const user = userEvent.setup();
    render(<Simulator />);
    await user.click(screen.getByRole('button', { name: 'Replay incident feed' }));

    fireEvent.change(screen.getByRole('slider', { name: 'Show alerts at or above' }), {
      target: { value: '3' },
    });
    expect(screen.getByText('critical', { selector: 'output' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /E3/ }));
    expect(screen.getByText('rpki-invalid')).toBeInTheDocument();
    expect(screen.queryByText('unexpected-origin')).not.toBeInTheDocument();
    expect(screen.getByText('1 finding below the critical threshold.')).toBeInTheDocument();
  });

  it('reports when an event has no findings at the chosen threshold', async () => {
    const user = userEvent.setup();
    render(<Simulator />);
    await user.click(screen.getByRole('button', { name: 'Replay incident feed' }));
    await user.click(screen.getByRole('button', { name: /E4/ }));
    fireEvent.change(screen.getByRole('slider', { name: 'Show alerts at or above' }), {
      target: { value: '3' },
    });
    expect(screen.getByText('No findings at or above critical.')).toBeInTheDocument();
    expect(screen.getByText('3 findings below the critical threshold.')).toBeInTheDocument();
  });

  it('replays both feeds and resets back to the empty state', async () => {
    const user = userEvent.setup();
    render(<Simulator />);
    await user.click(screen.getByRole('button', { name: 'Replay both' }));
    expect(screen.getByText('8 alerts · 1 critical')).toBeInTheDocument();

    const table = document.querySelector('#cmp');
    expect(table?.textContent).toContain('clean');
    expect(table?.textContent).toContain('incident');

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('no replay yet')).toBeInTheDocument();
    expect(
      screen.getByText('Replay a feed, then pick an event to see why it alerted.'),
    ).toBeInTheDocument();
  });

  it('keeps aria-pressed on exactly one selected event', async () => {
    const user = userEvent.setup();
    render(<Simulator />);
    await user.click(screen.getByRole('button', { name: 'Replay incident feed' }));
    await user.click(screen.getByRole('button', { name: /E4/ }));
    const pressed = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(1);
    expect(pressed[0]?.textContent).toContain('E4');
  });
});
