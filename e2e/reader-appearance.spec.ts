import { expect, test } from '@playwright/test';
import { openReader } from './reader-probe';

// One browser is enough for the visual matrix; device interaction has separate coverage.
test('themes remain legible at every supported width and with reduced motion', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'visual matrix on desktop Chromium');
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openReader(page);
  await page.getByRole('button', { name: 'Reading settings', exact: true }).click();

  for (const width of [360, 414, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['Sepia', 'Paper', 'Sage', 'Light', 'Slate', 'Dark', 'Auto']) {
      await page.getByRole('button', { name: `${theme} theme`, exact: true }).click();
      await expect(page.getByRole('status')).toHaveText('Preferences synced across devices');
      const metrics = await page.evaluate(() => {
        const popup = document.querySelector<HTMLElement>('[data-slot="sheet-content"]');
        const box = popup?.getBoundingClientRect();
        const colour = (token: string): number[] => {
          const element = document.createElement('span');
          element.style.color = `var(${token})`;
          document.body.appendChild(element);
          const rgb = getComputedStyle(element).color.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
          element.remove();
          return rgb;
        };
        const luminance = (rgb: number[]): number => rgb.map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
        const contrast = (a: string, b: string): number => {
          const light = luminance(colour(a)); const dark = luminance(colour(b));
          return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
        };
        const targets = Array.from(popup?.querySelectorAll('button') ?? []).filter((button) => !button.closest('[data-slot="sheet-close"]'));
        return {
          overflow: popup ? popup.scrollWidth > popup.clientWidth : true,
          left: box?.left ?? -1, right: box?.right ?? Infinity,
          textContrast: contrast('--on-surface', '--background'),
          secondaryContrast: contrast('--on-surface-variant', '--surface-container-low'),
          buttonContrast: contrast('--primary', '--primary-foreground'),
          translationContrast: contrast('--on-reader-translation', '--reader-translation'),
          smallTargets: targets.filter((button) => button.getBoundingClientRect().height < 44).length,
        };
      });
      expect(metrics.overflow, `${width}/${theme} overflow`).toBe(false);
      expect(metrics.left).toBeGreaterThanOrEqual(0);
      expect(metrics.right).toBeLessThanOrEqual(width + 1);
      expect(metrics.textContrast, `${theme} book text`).toBeGreaterThanOrEqual(4.5);
      expect(metrics.secondaryContrast, `${theme} secondary text`).toBeGreaterThanOrEqual(4.5);
      expect(metrics.buttonContrast, `${theme} action text`).toBeGreaterThanOrEqual(4.5);
      expect(metrics.translationContrast, `${theme} translations`).toBeGreaterThanOrEqual(4.5);
      expect(metrics.smallTargets).toBe(0);
      await page.getByRole('button', { name: 'Editorial preset', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`settings-${width}-${theme.toLowerCase()}.png`) });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
      await page.screenshot({ path: testInfo.outputPath(`reader-${width}-${theme.toLowerCase()}.png`) });
      await page.getByRole('button', { name: 'Reading settings', exact: true }).click();
    }
  }
  await page.getByRole('button', { name: 'Reset settings', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Preferences synced across devices');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Reading settings', exact: true })).toBeFocused();
});
