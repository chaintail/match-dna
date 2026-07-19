import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../src/App.js";
import { formatMinute, materialLabel } from "../src/lib.js";

describe("studio", () => {
  it("formats time and materials", () => {
    expect(formatMinute(-0.1)).toBe("PRE");
    expect(formatMinute(94)).toBe("90+4′");
    expect(materialLabel("amber")).toContain("awaiting proof");
  });
  it("renders all inspector modes", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText("MATCH DNA")).toBeInTheDocument();
    expect(screen.getByText(/Live is witness/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Proof/i }));
    expect(screen.getByText("PROOF MICROSCOPE")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Witness$/i }));
    expect(screen.getByText("COMMIT / REVEAL")).toBeInTheDocument();
  });
});
