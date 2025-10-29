import { semanticVersionSchema } from '@repo/definitions'

/**
 * Compares two semantic version strings
 * @param v1 - First version string (e.g., "1.10.0")
 * @param v2 - Second version string (e.g., "1.11.0")
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 * @throws ZodError if either version string is invalid
 */
export function compareVersions(v1: string, v2: string): number {
  // Validate using Zod schema
  semanticVersionSchema.parse(v1)
  semanticVersionSchema.parse(v2)

  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  // After validation, both versions are guaranteed to have exactly 3 parts
  for (let i = 0; i < 3; i++) {
    const part1 = parts1[i]!
    const part2 = parts2[i]!

    if (part1 < part2)
      return -1
    if (part1 > part2)
      return 1
  }

  return 0
}
