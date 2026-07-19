import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import StoryPage from "./StoryPage.js";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(
  <StrictMode>
    <StoryPage />
  </StrictMode>,
);
