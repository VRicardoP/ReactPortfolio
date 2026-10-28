// DT-208: el diseño compacto se activa en cualquier pantalla táctil sin ratón
// hasta 1024 px, no solo por debajo de 768. Cada proyecto táctil de
// playwright.config.js declara en `metadata.expectedLayout` qué modo espera.
import { test, expect, injectAuth } from '../fixtures/base.js';
import { TOUCH_COMPACT_BREAKPOINT } from '../../src/config/layout.js';

const MIN_TOUCH_TARGET = 44;

const expectedLayout = () => test.info().project.metadata.expectedLayout;

const assertNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
};

const assertTouchTargets = async (locator) => {
  const boxes = await locator.evaluateAll((nodes) =>
    nodes.map((n) => { const r = n.getBoundingClientRect(); return { w: r.width, h: r.height }; }),
  );
  expect(boxes.length).toBeGreaterThan(0);
  for (const box of boxes) {
    expect(box.h).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(box.w).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  }
};

test.describe('DT-208 · diseño compacto en pantallas táctiles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('la pantalla emulada es táctil y sin ratón', async ({ page }) => {
    const coarse = await page.evaluate(() => matchMedia('(hover: none) and (pointer: coarse)').matches);
    expect(coarse).toBe(true);
  });

  test('html[data-layout] refleja el modo esperado para este viewport', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('data-layout', expectedLayout());
  });

  test('sin desbordamiento horizontal', async ({ page }) => {
    await page.locator('.mobile-section, .floating-window').first().waitFor({ timeout: 10_000 });
    await assertNoHorizontalOverflow(page);
  });

  test('compacto: secciones apiladas, sin ventanas flotantes, Perfil abierto', async ({ page }) => {
    test.skip(expectedLayout() !== 'compact');
    await expect(page.locator('.mobile-section').first()).toBeVisible({ timeout: 10_000 });
    expect(await page.locator('.mobile-section').count()).toBeGreaterThanOrEqual(9);
    await expect(page.locator('.floating-window')).toHaveCount(0);
    // defaultExpanded llega hasta FloatingWindow: Perfil arranca abierto.
    await expect(page.locator('.mobile-section-header').first()).toHaveAttribute('aria-expanded', 'true');
  });

  test('compacto: la página hace scroll y los objetivos táctiles miden 44 px', async ({ page }) => {
    test.skip(expectedLayout() !== 'compact');
    await expect(page.locator('.mobile-section').first()).toBeVisible({ timeout: 10_000 });
    // Lista estable: filtrar por aria-expanded re-resolvería el selector tras
    // cada clic y el índice siguiente dejaría de existir.
    for (const header of await page.locator('.mobile-section-header').all()) {
      if (await header.getAttribute('aria-expanded') === 'false') await header.click();
    }
    await assertTouchTargets(page.locator('.mobile-section-header, .mobile-nav-btn, .mobile-chat-fab'));

    await page.evaluate(() => window.scrollTo(0, 600));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test('escritorio táctil: controles de ventana de 44 px y ventana dentro del viewport', async ({ page }) => {
    test.skip(expectedLayout() !== 'desktop');
    const welcome = page.locator('[aria-labelledby="welcome-window-title"]');
    await expect(welcome).toBeVisible({ timeout: 15_000 });
    await assertTouchTargets(welcome.locator('.control-btn'));

    const viewport = page.viewportSize();
    const box = await welcome.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  });

  test('girar el dispositivo cambia de modo sin recargar', async ({ page }) => {
    const { width, height } = page.viewportSize();
    await page.setViewportSize({ width: height, height: width });
    const rotated = height <= TOUCH_COMPACT_BREAKPOINT ? 'compact' : 'desktop';
    await expect(page.locator('html')).toHaveAttribute('data-layout', rotated);
    if (rotated === 'compact') {
      await expect(page.locator('.mobile-section').first()).toBeVisible({ timeout: 10_000 });
    } else {
      await expect(page.locator('.floating-window').first()).toBeVisible({ timeout: 10_000 });
    }
    await page.setViewportSize({ width, height });
    await expect(page.locator('html')).toHaveAttribute('data-layout', expectedLayout());
  });

  test('el panel de administración sigue el mismo modo', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/dashboard');
    if (expectedLayout() === 'compact') {
      await expect(page.locator('.mobile-dashboard-tabs')).toBeVisible({ timeout: 15_000 });
      await assertTouchTargets(page.locator('.mobile-dashboard-tab'));
    } else {
      await expect(page.locator('.floating-window').first()).toBeVisible({ timeout: 15_000 });
    }
    await assertNoHorizontalOverflow(page);
  });
});
