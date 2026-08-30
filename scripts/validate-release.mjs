import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const readText = (path) => readFileSync(`${repositoryRoot}${path}`, "utf8");
const readJson = (path) => JSON.parse(readText(path));

const packagePaths = [
  "package.json",
  "apps/mirante/package.json",
  "packages/core/package.json",
  "packages/geonode/package.json",
  "packages/i18n/package.json",
  "packages/map/package.json",
  "packages/sdk/package.json",
  "packages/ui/package.json",
];

const semver =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?$/;
const rootManifest = readJson("package.json");
const releaseVersion =
  process.env.MIRANTE_RELEASE_VERSION ?? rootManifest.version;
const errors = [];

if (!semver.test(releaseVersion)) {
  errors.push(`${releaseVersion} is not a supported Semantic Version`);
}

for (const path of packagePaths) {
  const manifest = readJson(path);
  if (manifest.version !== releaseVersion) {
    errors.push(
      `${path} declares ${manifest.version}, expected ${releaseVersion}`,
    );
  }

  for (const dependencyGroup of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    for (const [name, version] of Object.entries(
      manifest[dependencyGroup] ?? {},
    )) {
      if (name.startsWith("@mirante/") && version !== releaseVersion) {
        errors.push(
          `${path} pins ${name} to ${version}, expected ${releaseVersion}`,
        );
      }
    }
  }
}

const lockfile = readJson("package-lock.json");
if (lockfile.version !== releaseVersion) {
  errors.push(
    `package-lock.json declares ${lockfile.version}, expected ${releaseVersion}`,
  );
}

for (const path of packagePaths) {
  const lockPath =
    path === "package.json" ? "" : path.replace(/\/package\.json$/, "");
  const lockedPackage = lockfile.packages?.[lockPath];
  if (!lockedPackage) {
    errors.push(`package-lock.json does not contain ${lockPath || "the root"}`);
  } else if (lockedPackage.version !== releaseVersion) {
    errors.push(
      `package-lock.json records ${lockPath || "the root"} as ${lockedPackage.version}, expected ${releaseVersion}`,
    );
  }

  for (const [name, version] of Object.entries(
    lockedPackage?.dependencies ?? {},
  )) {
    if (name.startsWith("@mirante/") && version !== releaseVersion) {
      errors.push(
        `package-lock.json pins ${name} for ${lockPath || "the root"} to ${version}, expected ${releaseVersion}`,
      );
    }
  }
}

const changelog = readText("CHANGELOG.md");
if (!changelog.includes(`## [${releaseVersion}] - `)) {
  errors.push(`CHANGELOG.md has no dated ${releaseVersion} release section`);
}

try {
  readText(`docs/releases/${releaseVersion}.md`);
} catch {
  errors.push(`docs/releases/${releaseVersion}.md does not exist`);
}

const productionCompose = readText("compose.stack.production.yml");
if (/^\s*build:/m.test(productionCompose)) {
  errors.push("compose.stack.production.yml must not contain build directives");
}

if (
  !productionCompose.includes("ghcr.io/barbosaneto/mirante") ||
  !productionCompose.includes(`MIRANTE_VERSION:-${releaseVersion}`)
) {
  errors.push(
    `compose.stack.production.yml does not default Mirante to ${releaseVersion}`,
  );
}

for (const image of [
  "geonode/geonode",
  "geonode/nginx",
  "geonode/geoserver",
  "geonode/postgis",
  "memcached",
  "redis",
]) {
  if (!productionCompose.includes(image)) {
    errors.push(`compose.stack.production.yml does not pin ${image}`);
  }
}

const arm64Compose = readText("compose.stack.production.arm64.yml");
for (const image of [
  "compat-arm64-geonode-5.1.0-r1",
  "compat-arm64-nginx-1.31.2-r1",
  "compat-arm64-geoserver-2.28.4-r1",
  "compat-arm64-postgis-15-3.5-r1",
]) {
  if (!arm64Compose.includes(image)) {
    errors.push(`compose.stack.production.arm64.yml does not pin ${image}`);
  }
}

if (!arm64Compose.includes("platform: linux/arm64")) {
  errors.push("compose.stack.production.arm64.yml does not require ARM64");
}

const developmentCompose = readText("compose.yml");
for (const image of [
  "geonode/geonode",
  "geonode/nginx",
  "geonode/geoserver",
  "geonode/postgis",
  "memcached",
  "redis",
]) {
  if (!developmentCompose.includes(image)) {
    errors.push(`compose.yml does not use official image ${image}`);
  }
}

for (const dockerfile of [
  "docker/geonode/Dockerfile",
  "docker/postgis/Dockerfile",
  "docker/memcached/Dockerfile",
  "docker/redis/Dockerfile",
]) {
  if (developmentCompose.includes(dockerfile)) {
    errors.push(
      `compose.yml must not build runtime service from ${dockerfile}`,
    );
  }
}

if (errors.length > 0) {
  console.error("Release validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Release ${releaseVersion} is internally consistent.`);
