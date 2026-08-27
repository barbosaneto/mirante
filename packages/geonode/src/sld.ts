export interface DatasetUploadStyleBase {
  fillColor: string;
  strokeColor: string;
}

export interface DatasetUploadPolygonStyle extends DatasetUploadStyleBase {
  geometry: "polygon";
}

export interface DatasetUploadPointStyle extends DatasetUploadStyleBase {
  geometry: "point";
  shape: "circle" | "square";
}

export type DatasetUploadStyle =
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
    !colorPattern.test(style.fillColor) ||
    !colorPattern.test(style.strokeColor)
  ) {
    throw new Error("Dataset style colors must use hexadecimal values.");
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
