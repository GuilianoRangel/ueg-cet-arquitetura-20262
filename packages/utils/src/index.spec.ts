import { formatGreeting } from "./index";

describe("formatGreeting", () => {
  it("should format greeting correctly", () => {
    expect(formatGreeting("World")).toBe("Hello, World!");
  });
});
