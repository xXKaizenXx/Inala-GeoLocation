import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./ui/App";
import "./ui/styles.css";
import inalaSvg from "./ui/inala-svg.png";

function setFavicon(src: string) {
  // Some browsers only update the favicon after a real URL exists for it.
  // We inject a link tag pointing at the bundled asset URL.
  const head = document.head;
  const existing = head.querySelector("link[rel='icon'], link[rel='shortcut icon']");
  if (existing) existing.remove();

  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = src;
  head.appendChild(link);
}

setFavicon(inalaSvg);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

