/**
 * Minimal major-version compatibility check (PRD UPDATE_PRD.md §13.4: Plugin
 * API follows SemVer, breaking changes require a major bump). Deliberately
 * not a full SemVer range parser — just enough to reject a plugin written
 * against an incompatible major version of the Plugin API.
 */
export function isApiVersionCompatible(pluginApiVersion: string, hostApiVersion: string): boolean {
  return majorVersion(pluginApiVersion) === majorVersion(hostApiVersion);
}

function majorVersion(version: string): string {
  const [major] = version.split(".");
  return major ?? version;
}
