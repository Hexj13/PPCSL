export const DROPDOWN_PORTAL_VIEWPORT_MARGIN_PX = 8;

export function clampDropdownPortalLeft({
  triggerLeft,
  triggerRight,
  menuWidth,
  viewportWidth,
  margin = DROPDOWN_PORTAL_VIEWPORT_MARGIN_PX,
}: {
  triggerLeft: number;
  triggerRight: number;
  menuWidth: number;
  viewportWidth: number;
  margin?: number;
}): number {
  const maxWidth = Math.max(0, viewportWidth - margin * 2);
  const width = Math.min(Math.max(0, menuWidth), maxWidth);
  const spaceRight = viewportWidth - triggerLeft - margin;
  const spaceLeft = triggerLeft - margin;
  let left: number;
  if (spaceRight >= width) {
    left = triggerLeft;
  } else if (spaceLeft >= width) {
    left = triggerRight - width;
  } else {
    left = spaceRight >= spaceLeft ? triggerLeft : triggerRight - width;
  }
  return Math.max(margin, Math.min(left, viewportWidth - width - margin));
}
