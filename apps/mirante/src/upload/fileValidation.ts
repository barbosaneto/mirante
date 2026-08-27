export const maximumDatasetFileSize = 50 * 1024 * 1024;

export type DatasetFileValidationErrorCode =
  | "empty-file"
  | "file-too-large"
  | "invalid-geojson"
  | "invalid-kml"
  | "invalid-zip"
  | "unsupported-format";

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("The selected file could not be read as text."));
      }
    });
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("The selected file could not be read.")),
    );
    reader.readAsText(file);
  });
}

function readFileBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(
          new Error("The selected file could not be read as binary data."),
        );
      }
    });
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("The selected file could not be read.")),
    );
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
}

function fileExtension(file: File): string {
  return file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
}

async function validateGeoJson(file: File): Promise<boolean> {
  try {
    const payload: unknown = JSON.parse(await readFile(file));

    return Boolean(
      payload !== null &&
        typeof payload === "object" &&
        "type" in payload &&
        payload.type === "FeatureCollection" &&
        "features" in payload &&
        Array.isArray(payload.features),
    );
  } catch {
    return false;
  }
}

async function validateKml(file: File): Promise<boolean> {
  try {
    const document = new DOMParser().parseFromString(
      await readFile(file),
      "application/xml",
    );

    return (
      document.querySelector("parsererror") === null &&
      document.documentElement.localName.toLowerCase() === "kml"
    );
  } catch {
    return false;
  }
}

async function validateZip(file: File): Promise<boolean> {
  try {
    const bytes = new Uint8Array(await readFileBuffer(file));

    return (
      bytes.length === 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      bytes[2] === 0x03 &&
      bytes[3] === 0x04
    );
  } catch {
    return false;
  }
}

export async function validateDatasetFile(
  file: File,
): Promise<DatasetFileValidationErrorCode | null> {
  const extension = fileExtension(file);

  if (![".geojson", ".kml", ".zip"].includes(extension)) {
    return "unsupported-format";
  }

  if (file.size === 0) {
    return "empty-file";
  }

  if (file.size > maximumDatasetFileSize) {
    return "file-too-large";
  }

  if (extension === ".geojson" && !(await validateGeoJson(file))) {
    return "invalid-geojson";
  }

  if (extension === ".kml" && !(await validateKml(file))) {
    return "invalid-kml";
  }

  if (extension === ".zip" && !(await validateZip(file))) {
    return "invalid-zip";
  }

  return null;
}
