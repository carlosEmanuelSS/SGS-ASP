import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const localPython =
  process.platform === "win32"
    ? "../.venv/Scripts/python.exe"
    : "../.venv/bin/python";
const python =
  process.env.SGS_PYTHON || (existsSync(localPython) ? localPython : "python");
export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  workers: 1,
  retries: 0,
  use: {
    actionTimeout: 15000,
    baseURL: "http://127.0.0.1:5175",
    browserName: "chromium",
    // Mesmo fuso do servidor; senão, perto da meia-noite UTC a data do navegador vira "futura".
    timezoneId: "America/Sao_Paulo",
    ...(process.env.SGS_EDGE ? { channel: "msedge" } : {}),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: '"' + python + '" ../backend/e2e_server.py',
      url: "http://127.0.0.1:8002/healthz/",
      env: { SGS_E2E: "1" },
      timeout: 120000,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 5175",
      url: "http://127.0.0.1:5175",
      env: { SGS_API_TARGET: "http://127.0.0.1:8002" },
      timeout: 60000,
      reuseExistingServer: false,
    },
  ],
});
