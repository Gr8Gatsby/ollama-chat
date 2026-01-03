import path from "node:path";
import { defineConfig } from "vitest/config";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";

const storybookConfigDir = process.env.STORYBOOK_CONFIG_DIR
  ? path.resolve(process.env.STORYBOOK_CONFIG_DIR)
  : path.join(process.cwd(), ".storybook");

const storybookProjectName = `storybook:${storybookConfigDir}`;

export default defineConfig({
  plugins: [
    storybookTest({
      configDir: storybookConfigDir,
      tags: {
        exclude: ["skip-tests"],
      },
    }),
  ],
  test: {
    name: storybookProjectName,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({}),
      instances: [{ browser: "chromium" }],
    },
    setupFiles: [".storybook/vitest.setup.js"],
  },
});
