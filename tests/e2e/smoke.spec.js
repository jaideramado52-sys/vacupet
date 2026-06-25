// E2E smoke — verifica la app real en navegador (Chromium) sobre el ejemplo (#demo).
// Cubre: arranque + siembra del demo, pantalla de Salud con Medicación (Bloque 2),
// línea de tiempo unificada y tarjeta de emergencia con contacto del dueño (Bloque 1).
// Nota: el enrutado lee el hash SOLO al cargar, así que navegamos haciendo clic en la
// barra de pestañas (data-tab) en lugar de cambiar el hash (que sería same-document).
const { test, expect } = require('@playwright/test');

async function seedDemo(page) {
  await page.goto('/VacuPet.html#demo');
  await expect(page.locator('#app')).toBeVisible();
  await page.waitForFunction(() => {
    try { return (JSON.parse(localStorage.getItem('vacupet:data:v1') || '{}').pets || []).length >= 1; }
    catch { return false; }
  });
  await expect(page.locator('[data-tab="card"]')).toBeVisible();
}

test.describe('VacuPet — humo', () => {
  test('siembra el ejemplo y arranca', async ({ page }) => {
    await seedDemo(page);
  });

  test('Salud muestra la sección de Medicación', async ({ page }) => {
    await seedDemo(page);
    await page.locator('[data-tab="card"]').click();
    await expect(page.getByText('Medicación', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Carprofeno')).toBeVisible();
  });

  test('abre la línea de tiempo de salud', async ({ page }) => {
    await seedDemo(page);
    await page.locator('[data-tab="card"]').click();
    await page.locator('#timelineOpen').click();
    await expect(page.locator('.scrim')).toBeVisible();
    await expect(page.locator('.modal-head h3')).toHaveText('Línea de tiempo de salud');
  });

  test('tarjeta de emergencia con contacto del dueño', async ({ page }) => {
    await seedDemo(page);
    await page.locator('[data-tab="pet"]').click();
    await page.locator('#emergOpen').click();
    await expect(page.locator('.scrim')).toBeVisible();
    await expect(page.getByText('Ana López')).toBeVisible();
  });

  test('centro de recordatorios lista próximas fechas', async ({ page }) => {
    await seedDemo(page);
    await page.locator('[data-tab="more"]').click();
    await page.locator('#rcOpen').click();
    await expect(page.locator('.modal-head h3')).toHaveText('Centro de recordatorios');
    await expect(page.getByText('Rocky').first()).toBeVisible();
  });

  test('toggle sol/luna cambia el tema', async ({ page }) => {
    await seedDemo(page);
    const before = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('vacupet:data:v1')).theme || 'auto'; } catch { return 'auto'; } });
    await page.locator('#themeToggle').click();
    await page.waitForTimeout(350);
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('vacupet:data:v1')).theme);
    expect(['light', 'dark']).toContain(after);
    expect(after).not.toBe(before);
  });

  test('paywall aparece con el flag activo al superar el límite', async ({ page }) => {
    await seedDemo(page); // 6 mascotas de ejemplo
    // Activar la monetización en runtime (en prod el flag está apagado).
    await page.evaluate(() => { window.VACUPET_FEATURES.monetize = true; window.VACUPET_FEATURES.freePetLimit = 2; });
    await page.locator('[data-tab="home"]').click();
    await page.locator('#addPet').click();
    await expect(page.locator('.scrim')).toBeVisible();
    await expect(page.locator('.modal-head h3')).toHaveText('VacuPet Premium');
  });

  test('oferta de partner aparece y se descarta (flag on)', async ({ page }) => {
    await seedDemo(page);
    await page.evaluate(() => {
      window.VACUPET_PARTNERS = { enabled: true, country: 'GT', offers: [
        { id: 'seguro', type: 'insurance', contexts: ['home'], countries: ['*'], title: 'Seguro veterinario', sub: 'Desde QXX/mes', cta: 'Ver planes', url: 'https://example.com/seguro' }
      ] };
    });
    await page.locator('[data-tab="home"]').click();
    await expect(page.locator('.offer')).toBeVisible();
    await expect(page.getByText('Seguro veterinario')).toBeVisible();
    await page.locator('[data-offerx]').click();
    await expect(page.locator('.offer')).toHaveCount(0);
  });

  test('selector de país ajusta la normativa de rabia', async ({ page }) => {
    await seedDemo(page);
    await page.locator('[data-tab="more"]').click();
    await page.locator('#paisSel').selectOption('US');
    await expect(page.locator('#paisSel')).toBeVisible();
    // Tras elegir EE. UU., la nota debe indicar el refuerzo cada 3 años.
    await expect(page.getByText('cada 3 años')).toBeVisible();
  });
});
