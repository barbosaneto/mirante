import { changeLocale } from "@mirante/i18n";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DatasetUploadDialog } from "./DatasetUploadDialog";

describe("DatasetUploadDialog", () => {
  beforeEach(async () => {
    await changeLocale("en");
  });

  it("submits an optional line style with color and width", async () => {
    const onUpload = vi.fn();
    const { container } = render(
      <DatasetUploadDialog
        state={{ status: "idle", progress: 0 }}
        onClose={vi.fn()}
        onUpload={onUpload}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Upload a dataset" });
    const fileInput =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File(
      [JSON.stringify({ type: "FeatureCollection", features: [] })],
      "roads.geojson",
      { type: "application/geo+json" },
    );

    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, { target: { files: [file] } });
    await within(dialog).findByText("Dataset file ready to upload.");

    fireEvent.change(
      within(dialog).getByRole("combobox", { name: "Geometry style" }),
      { target: { value: "line" } },
    );
    fireEvent.change(within(dialog).getByLabelText("Line color"), {
      target: { value: "#dc2626" },
    });
    fireEvent.change(within(dialog).getByLabelText("Line width (px)"), {
      target: { value: "3.5" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Upload dataset" }),
    );

    expect(onUpload).toHaveBeenCalledWith(file, {
      metadata: undefined,
      style: {
        geometry: "line",
        strokeColor: "#dc2626",
        strokeWidth: 3.5,
      },
      visibility: undefined,
    });
  });
});
