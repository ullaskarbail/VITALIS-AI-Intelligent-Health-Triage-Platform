/** Default Zoom room for in-app video consultation (override with NEXT_PUBLIC_TELEHEALTH_URL). */
export const DEFAULT_TELEHEALTH_URL =
  "https://us05web.zoom.us/j/86080004739?pwd=0n2tHXnIRQ74YNPVhbmZ1PMQLHr54u.1";

export function getTelehealthUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_TELEHEALTH_URL?.trim();
  return fromEnv || DEFAULT_TELEHEALTH_URL;
}
