import { expect, test } from '@playwright/test';

test.describe('smoke', () => {
  test('renders the page and every section without horizontal overflow', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Know when someone else announces your prefix.',
    );
    await expect(page).toHaveTitle(/RouteSentinel/);

    for (const id of ['how', 'try', 'results', 'features', 'start', 'scope', 'faq']) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });

  test('renders at mobile width without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('marks every external link noopener noreferrer', async ({ page }) => {
    await page.goto('./');
    const links = await page.locator('a[href^="http"]').evaluateAll((anchors) =>
      anchors.map((anchor) => ({
        href: anchor.getAttribute('href') ?? '',
        rel: anchor.getAttribute('rel') ?? '',
      })),
    );
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.rel, link.href).toBe('noopener noreferrer');
    }
  });

  test('replays the incident feed, selects E4 and filters findings', async ({ page }) => {
    await page.goto('./#try');
    await page.getByRole('button', { name: 'Replay incident feed' }).click();

    await expect(page.locator('.shead .chip')).toHaveText('8 alerts · 1 critical');
    await page.getByRole('button', { name: /E4/ }).click();

    const findings = page.locator('#sim');
    await expect(findings.getByText('unexpected-subprefix')).toBeVisible();
    await expect(findings.getByText('unexpected-origin')).toBeVisible();
    await expect(findings.getByText('rpki-unknown')).toBeVisible();

    const slider = page.getByRole('slider', { name: 'Show alerts at or above' });
    await slider.fill('3');
    await expect(page.locator('#sim output')).toHaveText('critical');
    await expect(findings.getByText('No findings at or above critical.')).toBeVisible();
    await expect(findings.getByText('3 findings below the critical threshold.')).toBeVisible();
  });

  test('replays both feeds and resets the simulator', async ({ page }) => {
    await page.goto('./#try');
    await page.getByRole('button', { name: 'Replay both' }).click();
    await expect(page.locator('.shead .chip')).toHaveText('8 alerts · 1 critical');
    await expect(page.locator('#cmp')).toContainText('clean');
    await expect(page.locator('#cmp')).toContainText('incident');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('.shead .chip')).toHaveText('no replay yet');
  });

  test('supports arrow-key navigation in the hero tour', async ({ page }) => {
    await page.goto('./');
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(5);
    await expect(page.getByRole('tab', { selected: true })).toHaveText('Ingest');

    await page.getByRole('tab', { name: 'Ingest' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { selected: true })).toHaveText('Match');

    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { selected: true })).toHaveText('Review');

    await page.keyboard.press('Home');
    await expect(page.getByRole('tab', { selected: true })).toHaveText('Ingest');
  });

  test('shows the computed feed totals', async ({ page }) => {
    await page.goto('./#results');
    const results = page.locator('#results');
    await expect(results.getByText('3 events, 0 alerts.')).toBeVisible();
    await expect(results.getByText('5 events, 8 alerts.')).toBeVisible();
    await expect(results.getByText('1', { exact: true }).first()).toBeVisible();
  });

  test('opens a FAQ answer with the native disclosure', async ({ page }) => {
    await page.goto('./#faq');
    const question = page.getByText('Is IPv6 supported?');
    await question.click();
    await expect(page.getByText(/HTTP 500/)).toBeVisible();
  });
});
