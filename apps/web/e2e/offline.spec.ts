import { expect, test } from '@playwright/test';

test.describe('Lexomata PWA Offline E2E', () => {
  test('funciona completamente offline tras precache del Service Worker', async ({
    page,
    context,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto('/');
    await expect(page.getByText('Lexomata')).toBeVisible();

    // Esperar a que el Service Worker quede activo y precachee los assets.
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    // Cortar la red por completo y recargar.
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Lexomata')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Lienzo del autómata' })).toBeVisible();

    // 1. Cargar ejemplo AFD y simular cadena aceptada y rechazada.
    await page.getByRole('button', { name: /archivo/i }).click();
    await page.getByRole('button', { name: /afd/i }).first().click();

    const faInput = page.getByPlaceholder('cadena de entrada');
    await faInput.fill('101');
    await page.getByRole('button', { name: 'Ejecutar rápido' }).click();
    await expect(page.getByText('ACEPTADA')).toBeVisible();

    await faInput.fill('100');
    await page.getByRole('button', { name: 'Ejecutar rápido' }).click();
    await expect(page.getByText('RECHAZADA')).toBeVisible();

    // 2. Cargar ejemplo de Máquina de Turing (0^n 1^n), avanzar/retroceder y ejecutar rápido.
    await page.getByRole('button', { name: /archivo/i }).click();
    await page.getByRole('button', { name: /0\^n 1\^n|0ⁿ1ⁿ|turing/i }).first().click();

    const tmInput = page.getByPlaceholder('entrada inicial');
    await tmInput.fill('0011');
    const stepForward = page.getByRole('button', { name: 'Paso adelante' });
    const stepBack = page.getByRole('button', { name: 'Paso atrás' });
    await stepForward.click();
    if (await stepBack.isDisabled()) {
      await stepForward.click();
    }
    await expect(stepBack).toBeEnabled();
    await stepBack.click();
    await page.getByRole('button', { name: 'Ejecutar rápido' }).click();
    await expect(page.getByText('ACEPTADA')).toBeVisible();

    // 3. Ejecutar Batch Runner (Lotes).
    await page.getByRole('button', { name: 'Lotes' }).click();
    const runBatch = page.getByRole('button', { name: 'Ejecutar', exact: true });
    if (await runBatch.isDisabled()) {
      await page.getByRole('button', { name: 'Caso' }).click();
      await page.getByPlaceholder('cadena').first().fill('0011');
    }
    await runBatch.click();
    await expect(page.getByText(/ACCEPTED|REJECTED|ACEPTADA|RECHAZADA|pasadas/i).first()).toBeVisible();

    // 4. Abrir personalización de interfaz y alternar Oscuro / Claro suave / Claro sin errores.
    await page.getByRole('button', { name: 'Personalizar interfaz' }).click();
    await expect(page.getByRole('dialog', { name: 'Personalizar interfaz' })).toBeVisible();
    await page.getByRole('button', { name: 'Claro suave', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'soft-light');
    await page.getByRole('button', { name: 'Claro', exact: true }).click();
    await page.getByRole('button', { name: 'Oscuro', exact: true }).click();
    await page.getByRole('button', { name: 'Listo' }).click();

    // 5. Guardar versión intermedia en Historial de versiones.
    await page.getByRole('button', { name: /archivo/i }).click();
    await page.getByRole('button', { name: /historial de versiones/i }).click();
    await expect(page.getByRole('dialog', { name: 'Historial de versiones' })).toBeVisible();
    await page.getByPlaceholder(/etiqueta opcional/i).fill('Checkpoint E2E');
    await page.getByRole('button', { name: 'Guardar versión' }).click();
    await expect(page.getByText('Checkpoint E2E', { exact: true })).toBeVisible();
    await page
      .getByRole('dialog', { name: 'Historial de versiones' })
      .getByRole('button', { name: 'Cerrar', exact: true })
      .last()
      .click();

    // 6. Abrir atajos de teclado con '?'.
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: 'Atajos de teclado' })).toBeVisible();
    await page.getByRole('button', { name: 'Entendido' }).click();

    expect(consoleErrors).toEqual([]);
  });
});
