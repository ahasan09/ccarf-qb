/* The Mantine theme: the app's own ink blue as the primary colour, its
 * three typefaces, and a colour-scheme manager that keeps using the
 * "ccarf.theme" key (JSON "auto" | "light" | "dark") so a theme chosen
 * before the React version still applies. */
import { createTheme } from "@mantine/core";

const pen = [
  "#eaf0fe", "#d3defb", "#a6bcf5", "#7598ef", "#4d79ea",
  "#3466e6", "#1f4fd8", "#1442c0", "#0b3aad", "#003199",
];

export const DOMAIN_COLORS = { 1: "grape", 2: "cyan", 3: "orange", 4: "teal", 5: "yellow" };

export const theme = createTheme({
  primaryColor: "pen",
  primaryShade: { light: 6, dark: 4 },
  colors: { pen },
  fontFamily: '"Atkinson Hyperlegible", system-ui, -apple-system, "Segoe UI", sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", ui-monospace, Menlo, monospace',
  headings: {
    fontFamily: '"Bricolage Grotesque", "Avenir Next", system-ui, sans-serif',
    fontWeight: "700",
  },
  defaultRadius: "md",
  cursorType: "pointer",
  components: {
    Card: { defaultProps: { withBorder: true, radius: "lg", padding: "lg", shadow: "xs" } },
    Button: { defaultProps: { radius: "md" } },
    Tooltip: { defaultProps: { withArrow: true, openDelay: 300 } },
    Modal: { defaultProps: { transitionProps: { duration: 120 } } },
  },
});

const KEY = "ccarf.theme";
export const THEMES = ["auto", "light", "dark"];

function read() {
  try {
    const t = JSON.parse(localStorage.getItem(KEY));
    return THEMES.includes(t) ? t : "auto";
  } catch (e) {
    return "auto";
  }
}

export const colorSchemeManager = {
  get: () => read(),
  set: (value) => { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch (e) { /* blocked */ } },
  subscribe: () => {},
  unsubscribe: () => {},
  clear: () => { try { localStorage.removeItem(KEY); } catch (e) { /* blocked */ } },
};
