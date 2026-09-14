import { test, expect, type Page } from "@playwright/test";
async function entrar(
  page: Page,
  user: string,
  password = "Somente-Testes-E2E-846!",
) {
  await page.getByLabel("Usuário", { exact: true }).fill(user);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar no sistema" }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
}
async function navegar(page: Page, name: string) {
  await expect(page.locator(".app-shell")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Módulos do sistema" });
  if (!(await nav.isVisible()))
    await page.getByRole("button", { name: "Menu", exact: true }).click();
  await nav.getByRole("button", { name, exact: true }).click();
}
async function sair(page: Page) {
  if (
    !(await page.getByRole("button", { name: "Sair", exact: true }).isVisible())
  )
    await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Entrar no sistema" }),
  ).toBeVisible();
}
test("fluxo real integrado: sigilo, auditoria, doações, relatórios, frequência e responsividade", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await entrar(page, "tecnico_e2e");
  await navegar(page, "Atendimentos");
  await page
    .getByRole("button", { name: "+ Registrar atendimento", exact: true })
    .click();
  await page
    .getByLabel("Aluno *", { exact: true })
    .selectOption({ label: "Aluno E2E · 01/01/2010" });
  await page
    .getByLabel("Descrição *", { exact: true })
    .fill("Relato confidencial E2E");
  page.once("dialog", (dialog) => dialog.dismiss());
  await navegar(page, "Doações");
  await expect(page.getByLabel("Descrição *", { exact: true })).toHaveValue(
    "Relato confidencial E2E",
  );
  await page.screenshot({
    path: "test-results/atendimento-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(
    page.getByText("Registro salvo com sucesso.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Corrigir ou cancelar", exact: true })
    .click();
  await page
    .getByLabel("Descrição *", { exact: true })
    .fill("Relato corrigido E2E");
  await page
    .getByLabel("Motivo da alteração *", { exact: true })
    .fill("Conferência E2E");
  await page
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(
    page.getByText("Relato corrigido E2E", { exact: true }).first(),
  ).toBeVisible();
  await page.getByText(/Versão 1 ·/).click();
  await expect(
    page.getByText("Relato confidencial E2E", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await navegar(page, "Alunos");
  await page
    .getByRole("button", { name: "Ver ficha de Aluno E2E", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Atendimentos do aluno" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Ver registro de/ }),
  ).toHaveCount(1);
  await sair(page);
  await entrar(page, "outro_e2e");
  await navegar(page, "Atendimentos");
  await expect(
    page.getByText("Nenhum registro encontrado.", { exact: true }),
  ).toBeVisible();
  await navegar(page, "Doações");
  await page
    .getByRole("button", { name: "+ Registrar doação", exact: true })
    .click();
  await page.getByLabel("Doador", { exact: true }).fill("Doador E2E");
  await page.getByLabel("Valor (R$) *", { exact: true }).fill("125.50");
  await page.getByLabel("Descrição *", { exact: true }).fill("Doação E2E");
  await page
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(
    page.getByText("Registro salvo com sucesso.", { exact: true }),
  ).toBeVisible();
  await navegar(page, "Relatórios");
  await expect(
    page.getByRole("heading", { name: "Doações recebidas" }),
  ).toBeVisible();
  await expect(page.getByText(/R\$\s*125,50/)).toBeVisible();
  await page.screenshot({
    path: "test-results/relatorios-desktop.png",
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("relatorio-sgs.csv");
  expect(await download.failure()).toBeNull();
  await navegar(page, "Doações");
  await page.getByRole("button", { name: /Ver registro de/ }).click();
  await page
    .getByRole("button", { name: "Corrigir ou cancelar", exact: true })
    .click();
  await page
    .getByLabel("Cancelar registro e impedir novas alterações", { exact: true })
    .check();
  await page
    .getByLabel("Motivo da alteração *", { exact: true })
    .fill("Registro duplicado de teste");
  await page
    .getByRole("button", { name: "Confirmar cancelamento", exact: true })
    .click();
  await expect(
    page.getByText("Registro cancelado, com histórico preservado.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Corrigir ou cancelar", exact: true }),
  ).toHaveCount(0);
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of [
      "Visão geral",
      "Alunos",
      "Oficinas e matrículas",
      "Frequência",
      "Atendimentos",
      "Doações",
      "Relatórios",
    ]) {
      await navegar(page, name);
      await expect(
        page.getByRole("heading", {
          name: name === "Oficinas e matrículas" ? "Oficinas e turmas" : name,
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText(
          /Carregando registros|Calculando indicadores|Buscando alunos|Buscando oficinas/,
        ),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
  }
  await page.screenshot({
    path: "test-results/relatorios-mobile.png",
    fullPage: true,
  });
  await sair(page);
  await entrar(page, "educador_e2e");
  await navegar(page, "Frequência");
  await page
    .getByRole("button", {
      name: "Abrir frequência de Oficina E2E A",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Situação de Aluno E2E", { exact: true })
    .selectOption("presente");
  await page
    .getByRole("button", { name: "Salvar chamada", exact: true })
    .click();
  await expect(
    page.getByText("Chamada registrada com sucesso.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("navigation").getByRole("button")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await page
    .getByLabel("Senha atual", { exact: true })
    .fill("Somente-Testes-E2E-846!");
  await page
    .getByLabel("Nova senha", { exact: true })
    .fill("Nova-Senha-E2E-927!");
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("Nova-Senha-E2E-927!");
  await page
    .getByRole("button", { name: "Salvar nova senha", exact: true })
    .click();
  await expect(
    page.getByText("Senha alterada. Outras sessões deverão entrar novamente.", {
      exact: true,
    }),
  ).toBeVisible();
  await sair(page);
  await entrar(page, "educador_e2e", "Nova-Senha-E2E-927!");
  await expect(
    page.getByRole("heading", { name: "Frequência", exact: true }),
  ).toBeVisible();
  await sair(page);
  expect(errors).toEqual([]);
});
