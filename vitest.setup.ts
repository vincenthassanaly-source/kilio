import "@testing-library/jest-dom/vitest";

// framer-motion (`useReducedMotion`, utilisé par NoteCard/TaskCard) lit
// `window.matchMedia`, absent de jsdom.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
