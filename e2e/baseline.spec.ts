// Phase B (scaffold, à supprimer avant livraison) : sans verrou, le marqueur
// de coquille s'affiche-t-il pour l'utilisateur de test ?
import { test, expect, type Page } from "@playwright/test";
import { ROUTES, type RouteContract } from "./routes";

function marker(page: Page, route: RouteContract) {
  return route.shellTestId
    ? page.getByTestId(route.shellTestId)
    : page.getByRole("heading", { level: 1, name: route.title, exact: true });
}

for (const route of ROUTES) {
  test(`baseline: ${route.path} rend sa coquille (sans verrou)`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page).toHaveURL(new RegExp(`${route.path.replace(/\//g, "\\/")}(\\?|$)`));
    await expect(marker(page, route)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("link", { name: "Plus", exact: true })).toBeVisible();
  });
}
