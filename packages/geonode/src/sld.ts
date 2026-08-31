export interface DatasetUploadStyleBase {
  strokeColor: string;
}

export interface DatasetUploadPolygonStyle extends DatasetUploadStyleBase {
  geometry: "polygon";
  fillColor: string;
}

export interface DatasetUploadPointStyle extends DatasetUploadStyleBase {
  geometry: "point";
  fillColor: string;
  shape: "circle" | "square";
}

export interface DatasetUploadLineStyle extends DatasetUploadStyleBase {
  geometry: "line";
  strokeWidth: number;
}

export type DatasetUploadStyle =
  | DatasetUploadLineStyle
  | DatasetUploadPointStyle
  | DatasetUploadPolygonStyle;

interface StyledDataset {
  id: number;
  title: string;
  layerName: string;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createSymbolizer(style: DatasetUploadStyle): string {
  if (style.geometry === "polygon") {
    return `<sld:PolygonSymbolizer>
      <sld:Fill>
        <sld:CssParameter name="fill">${style.fillColor}</sld:CssParameter>
        <sld:CssParameter name="fill-opacity">0.55</sld:CssParameter>
      </sld:Fill>
      <sld:Stroke>
        <sld:CssParameter name="stroke">${style.strokeColor}</sld:CssParameter>
        <sld:CssParameter name="stroke-width">1.5</sld:CssParameter>
      </sld:Stroke>
    </sld:PolygonSymbolizer>`;
  }

  if (style.geometry === "line") {
    return `<sld:LineSymbolizer>
      <sld:Stroke>
        <sld:CssParameter name="stroke">${style.strokeColor}</sld:CssParameter>
        <sld:CssParameter name="stroke-width">${style.strokeWidth}</sld:CssParameter>
        <sld:CssParameter name="stroke-linecap">round</sld:CssParameter>
        <sld:CssParameter name="stroke-linejoin">round</sld:CssParameter>
      </sld:Stroke>
    </sld:LineSymbolizer>`;
  }

  return `<sld:PointSymbolizer>
    <sld:Graphic>
      <sld:Mark>
        <sld:WellKnownName>${style.shape}</sld:WellKnownName>
        <sld:Fill>
          <sld:CssParameter name="fill">${style.fillColor}</sld:CssParameter>
        </sld:Fill>
        <sld:Stroke>
          <sld:CssParameter name="stroke">${style.strokeColor}</sld:CssParameter>
          <sld:CssParameter name="stroke-width">1.5</sld:CssParameter>
        </sld:Stroke>
      </sld:Mark>
      <sld:Size>12</sld:Size>
    </sld:Graphic>
  </sld:PointSymbolizer>`;
}

export function createDatasetStyleFile(
  dataset: StyledDataset,
  style: DatasetUploadStyle,
): File {
  const colorPattern = /^#[0-9a-f]{6}$/i;

  if (
    !colorPattern.test(style.strokeColor) ||
    (style.geometry !== "line" && !colorPattern.test(style.fillColor))
  ) {
    throw new Error("Dataset style colors must use hexadecimal values.");
  }

  if (
    style.geometry === "line" &&
    (!Number.isFinite(style.strokeWidth) ||
      style.strokeWidth < 0.5 ||
      style.strokeWidth > 20)
  ) {
    throw new Error("Dataset line width must be between 0.5 and 20 pixels.");
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sld:StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:sld="http://www.opengis.net/sld"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <sld:NamedLayer>
    <sld:Name>${escapeXml(dataset.layerName)}</sld:Name>
    <sld:UserStyle>
      <sld:Title>${escapeXml(dataset.title)}</sld:Title>
      <sld:FeatureTypeStyle>
        <sld:Rule>
          ${createSymbolizer(style)}
        </sld:Rule>
      </sld:FeatureTypeStyle>
    </sld:UserStyle>
  </sld:NamedLayer>
</sld:StyledLayerDescriptor>`;

  return new File([xml], `mirante-${dataset.id}.sld`, {
    type: "application/xml",
  });
}
