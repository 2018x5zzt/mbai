import { evaluateMbaiResult, getPrompt, questionBank } from "./lib/evaluate";
import { saveState, state } from "./state";
import { showToast } from "./toast";
import type { MbaiEvaluationResult, PromptMode } from "./types";
import { captureElement } from "./utils/capture";
import { copyText } from "./utils/clipboard";
import { buildSummary } from "./views/result";

const SHARE_CAPTURE_SELECTOR = "#share-capture";
const SHARE_FILE_NAME = "mbai-result.png";

type ActionHandler = (rerender: () => void) => void;

function getResult(): MbaiEvaluationResult {
  return evaluateMbaiResult(state.answers);
}

const ACTIONS: Readonly<Record<string, ActionHandler>> = {
  start(rerender) {
    state.screen = "quiz";
    state.currentQuestion = 0;
    state.answers = [];
    state.promptMode = "light";
    saveState();
    rerender();
  },
  resume(rerender) {
    state.screen = "quiz";
    state.currentQuestion = Math.min(
      state.answers.length,
      questionBank.length - 1,
    );
    saveState();
    rerender();
  },
  reset(rerender) {
    state.screen = "home";
    state.currentQuestion = 0;
    state.answers = [];
    state.promptMode = "light";
    saveState();
    rerender();
  },
  previous(rerender) {
    if (state.currentQuestion === 0) return;
    state.currentQuestion -= 1;
    saveState();
    rerender();
  },
  "scroll-samples"() {
    document
      .querySelector("#intro-samples")
      ?.scrollIntoView({ behavior: "smooth" });
  },
  capture(rerender) {
    void captureElement(SHARE_CAPTURE_SELECTOR, SHARE_FILE_NAME).then(() => {
      showToast("分享卡已导出。", "success", rerender);
    });
  },
  "copy-prompt"(rerender) {
    const result = getResult();
    void copyText(getPrompt(result.master, state.promptMode)).then(() => {
      showToast("提示词已复制。", "success", rerender);
    });
  },
  "copy-summary"(rerender) {
    const result = getResult();
    void copyText(buildSummary(result)).then(() => {
      showToast("结果文案已复制。", "success", rerender);
    });
  },
};

function chooseOption(optionIndex: number, rerender: () => void): void {
  state.answers[state.currentQuestion] = optionIndex;

  if (state.currentQuestion === questionBank.length - 1) {
    state.screen = "result";
  } else {
    state.currentQuestion += 1;
  }

  saveState();
  rerender();
}

function setPromptMode(mode: PromptMode, rerender: () => void): void {
  state.promptMode = mode;
  saveState();
  rerender();
}

function isDisabled(el: HTMLElement): boolean {
  if (el instanceof HTMLButtonElement) return el.disabled;
  return el.getAttribute("aria-disabled") === "true";
}

function routeClick(event: MouseEvent, rerender: () => void): void {
  const origin = event.target;
  if (!(origin instanceof Element)) return;

  const optionEl = origin.closest<HTMLElement>("[data-option-index]");
  if (optionEl && !isDisabled(optionEl)) {
    const value = Number(optionEl.dataset.optionIndex);
    if (Number.isFinite(value)) {
      chooseOption(value, rerender);
    }
    return;
  }

  const promptEl = origin.closest<HTMLElement>("[data-prompt]");
  if (promptEl && !isDisabled(promptEl)) {
    const mode = promptEl.dataset.prompt;
    if (mode === "light" || mode === "vibe" || mode === "efficiency") {
      setPromptMode(mode, rerender);
    }
    return;
  }

  const actionEl = origin.closest<HTMLElement>("[data-action]");
  if (actionEl && !isDisabled(actionEl)) {
    const action = actionEl.dataset.action ?? "";
    const handler = ACTIONS[action];
    if (handler) handler(rerender);
  }
}

export function attachEvents(rerender: () => void, root: HTMLElement): void {
  root.addEventListener("click", (event) => routeClick(event, rerender));
}
