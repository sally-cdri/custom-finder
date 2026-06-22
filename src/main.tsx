import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MiniTodo } from "./components/MiniTodo";

const isMini = new URLSearchParams(window.location.search).has("mini");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isMini ? <MiniTodo /> : <App />}</React.StrictMode>,
);
