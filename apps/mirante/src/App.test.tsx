import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("renders the initial localized message", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Mirante" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("An extensible Web GIS client for GeoNode."),
    ).toBeInTheDocument();
  });
});
