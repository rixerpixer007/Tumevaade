import { applyTheme } from "../features/theme-selection";
import { isSignedOutStuudiumAuthenticationDocument } from "../shared/sites";

export default defineUnlistedScript(() => {
  if (isSignedOutStuudiumAuthenticationDocument(document.documentElement, window.location.href)) {
    return;
  }

  document.documentElement.setAttribute("data-sid-enhancement", "enabled");
  applyTheme(document.documentElement, "monochrome-dark");
});
