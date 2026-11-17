import { applyTheme } from "../../features/theme-selection";
import { isSignedOutStuudiumAuthenticationDocument } from "../../shared/sites";
import type { ThemeId } from "../../shared/themes";

export function getEarlyActivationScript(themeId: ThemeId): string {
  return `activation-${themeId}.js`;
}

export function activateEarlyTheme(themeId: ThemeId): void {
  if (isSignedOutStuudiumAuthenticationDocument(document.documentElement, window.location.href)) {
    return;
  }

  document.documentElement.setAttribute("data-sid-enhancement", "enabled");
  applyTheme(document.documentElement, themeId);
}
