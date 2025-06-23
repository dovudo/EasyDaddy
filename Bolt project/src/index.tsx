import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Extension } from "./screens/Extension";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <Extension />
  </StrictMode>,
);
