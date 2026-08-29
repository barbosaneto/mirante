export const maximumDatasetFileSize = 50 * 1024 * 1024;

export type DatasetFileValidationErrorCode =
  | "empty-file"
  | "file-too-large"
  | "invalid-geojson"
  | "invalid-kml"
  | "invalid-zip"
  | "non-ascii-zip-filenames"
  | "unsafe-zip"
  | "unsupported-format";

const maximumZipEntries = 2_048;
const maximumZipUncompressedSize = 1024 * 1024 * 1024;
const maximumZipCompressionRatio = 200;

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

function readFileBuffer(file: Blob): Promise<ArrayBuffer> {
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
    reader.readAsArrayBuffer(file);
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
    const source = await readFile(file);
    if (/<!DOCTYPE|<!ENTITY/i.test(source)) return false;

    const document = new DOMParser().parseFromString(source, "application/xml");

    return (
      document.querySelector("parsererror") === null &&
      document.documentElement.localName.toLowerCase() === "kml"
    );
  } catch {
    return false;
  }
}

type ZipValidationResult =
  | "invalid"
  | "non-ascii-filenames"
  | "unsafe"
  | "valid";

function isUnsafeZipPath(filename: string): boolean {
  return (
    filename.includes("\0") ||
    filename.startsWith("/") ||
    filename.startsWith("\\") ||
    /^[a-zA-Z]:/.test(filename) ||
    filename
      .replaceAll("\\", "/")
      .split("/")
      .some((segment) => segment === "..")
  );
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const minimumOffset = Math.max(0, bytes.length - 65_557);

  for (let offset = bytes.length - 22; offset >= minimumOffset; offset -= 1) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x05 &&
      bytes[offset + 3] === 0x06
    ) {
      return offset;
    }
  }

  return -1;
}

async function validateZip(file: File): Promise<ZipValidationResult> {
  try {
    const bytes = new Uint8Array(await readFileBuffer(file));
    if (
      bytes.length < 22 ||
      bytes[0] !== 0x50 ||
      bytes[1] !== 0x4b ||
      bytes[2] !== 0x03 ||
      bytes[3] !== 0x04
    ) {
      return "invalid";
    }

    const endOffset = findEndOfCentralDirectory(bytes);
    if (endOffset < 0) {
      return "invalid";
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const diskEntryCount = view.getUint16(endOffset + 8, true);
    const entryCount = view.getUint16(endOffset + 10, true);
    const directorySize = view.getUint32(endOffset + 12, true);
    let offset = view.getUint32(endOffset + 16, true);
    const directoryEnd = offset + directorySize;

    if (
      entryCount === 0 ||
      entryCount !== diskEntryCount ||
      entryCount > maximumZipEntries ||
      directoryEnd > endOffset ||
      directoryEnd > bytes.length
    ) {
      return "invalid";
    }

    let totalUncompressedSize = 0;

    for (let entry = 0; entry < entryCount; entry += 1) {
      if (
        offset + 46 > directoryEnd ||
        view.getUint32(offset, true) !== 0x02014b50
      ) {
        return "invalid";
      }

      const filenameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const filenameStart = offset + 46;
      const filenameEnd = filenameStart + filenameLength;

      if (filenameEnd > directoryEnd) {
        return "invalid";
      }

      if (
        bytes.subarray(filenameStart, filenameEnd).some((byte) => byte > 0x7f)
      ) {
        return "non-ascii-filenames";
      }

      const filename = new TextDecoder("ascii").decode(
        bytes.subarray(filenameStart, filenameEnd),
      );
      totalUncompressedSize += uncompressedSize;
      const compressionRatio =
        compressedSize === 0
          ? uncompressedSize === 0
            ? 1
            : Number.POSITIVE_INFINITY
          : uncompressedSize / compressedSize;

      if (
        isUnsafeZipPath(filename) ||
        totalUncompressedSize > maximumZipUncompressedSize ||
        compressionRatio > maximumZipCompressionRatio
      ) {
        return "unsafe";
      }

      offset = filenameEnd + extraLength + commentLength;
    }

    return offset === directoryEnd ? "valid" : "invalid";
  } catch {
    return "invalid";
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

  if (extension === ".zip") {
    const zipValidation = await validateZip(file);

    if (zipValidation === "non-ascii-filenames") {
      return "non-ascii-zip-filenames";
    }

    if (zipValidation === "invalid") {
      return "invalid-zip";
    }

    if (zipValidation === "unsafe") {
      return "unsafe-zip";
    }
  }

  return null;
}
