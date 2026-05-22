import "./style.css";

import { attachEvents } from "./events";
import { evaluateMbaiResult, questionBank } from "./lib/evaluate";
import { reconcileState, state } from "./state";
import { renderToast } from "./toast";
import { renderHome } from "./views/home";
import { renderQuiz } from "./views/quiz";
import { renderResult } from "./views/result";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root");
}

function renderScreen(): string {
  if (state.screen === "home") {
    return `${renderHome()}${renderToast()}`;
  }

  if (state.screen === "quiz") {
    const question = questionBank[state.currentQuestion];
    return `${renderQuiz(question)}${renderToast()}`;
  }

  const result = evaluateMbaiResult(state.answers);
  return `${renderResult(result)}${renderToast()}`;
}

function render(): void {
  document.body.dataset.screen = state.screen;
  reconcileState();
  app!.innerHTML = renderScreen();
}

attachEvents(render, app);
render();
