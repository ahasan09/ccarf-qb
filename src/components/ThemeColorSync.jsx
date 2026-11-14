/* The browser bar colour (meta theme-color) follows the theme chosen in the
 * app, not only the device setting: pick Dark on a phone set to light and
 * the bar turns dark too. "Auto" follows the device, as before. */
import { useEffect } from "react";
import { useComputedColorScheme } from "@mantine/core";

export const BAR_COLORS = { light: "#f6f7f4", dark: "#17191c" };

export function ThemeColorSync() {
  const scheme = useComputedColorScheme("light");
  useEffect(() => {
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.setAttribute("content", BAR_COLORS[scheme] || BAR_COLORS.light);
    });
  }, [scheme]);
  return null;
}
