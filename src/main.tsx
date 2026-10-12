import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {Theme} from "@astryxdesign/core/theme";

import App from "@/App";
import "@/index.css";
import {defaultThemeSlug, themes} from "@/astryx-themes";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Theme theme={themes[defaultThemeSlug]} mode="dark">
      <App />
    </Theme>
  </StrictMode>,
);
