import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { MiniPlayer } from "./components/MiniPlayer/MiniPlayerPlaceholder";
import "./index.css";
import "./components/MiniPlayer/MiniPlayerPlaceholder.css";

const isMiniPlayerWindow =
  new URLSearchParams(window.location.search).get("window") === "mini-player";

const rootView = isMiniPlayerWindow ? <MiniPlayer /> : <App />;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{rootView}</React.StrictMode>,
);
