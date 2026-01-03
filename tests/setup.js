import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { toHaveNoViolations } from "jest-axe";

expect.extend({
  ...matchers,
  toHaveNoViolations,
});

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.setAttribute("lang", "en");
  document.documentElement.setAttribute("dir", "ltr");
  document.documentElement.setAttribute("data-theme", "light");
});
