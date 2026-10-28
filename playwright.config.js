import { defineConfig } from '@playwright/test';

// DT-208: además del escritorio con ratón, cinco pantallas táctiles sin ratón
// (`hasTouch` + `isMobile` hacen que Chromium declare `pointer: coarse` y
// `hover: none`). Solo corren el spec del diseño compacto; los demás specs
// dan por hecho ventanas flotantes y ratón. `expectedLayout` es lo que el
// spec comprueba: compacto hasta 1024 px táctiles, escritorio por encima.
const touchScreen = (width, height, expectedLayout) => ({
  use: {
    browserName: 'chromium',
    viewport: { width, height },
    hasTouch: true,
    isMobile: true,
    // Escala 1: a 2x, varios workers renderizando WebGL por software hacían
    // que la carga perezosa de las ventanas superase los tiempos de espera.
  },
  metadata: { expectedLayout },
  testMatch: /compact-layout\.spec\.js/,
});

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
      testIgnore: /compact-layout\.spec\.js/,
    },
    { name: 'phone-portrait', ...touchScreen(412, 915, 'compact') },
    { name: 'phone-landscape', ...touchScreen(915, 412, 'compact') },
    { name: 'tablet-768', ...touchScreen(768, 1024, 'compact') },
    { name: 'tablet-1024', ...touchScreen(1024, 768, 'compact') },
    { name: 'tablet-1180', ...touchScreen(1180, 820, 'desktop') },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
