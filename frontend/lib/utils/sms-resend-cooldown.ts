export function smsResendCooldownButtonLabel(
  cooldownSeconds: number,
  t: (key: string, params?: Record<string, string>) => string,
  keys: { withSeconds: string; withMinutes: string },
): string {
  if (cooldownSeconds > 120) {
    return t(keys.withMinutes, { minutes: Math.ceil(cooldownSeconds / 60).toString() });
  }
  return t(keys.withSeconds, { cooldown: cooldownSeconds.toString() });
}
