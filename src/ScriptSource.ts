/** Source cleanup shared by the lesson browser and compiler; no compiler dependency here. */
export function stripImportsExports(input: string): string {
  return input
    .replace(/^\s*export\s+/gm, '')
    .replace(/^\s*import[\s\S]*?['"].*?['"];?/gm, '')
    .trim()
}
