import { questionBank } from "./lib/evaluate";
import type { PromptMode } from "./types";

export type Screen = "home" | "quiz" | "result";

export interface SessionState {
  screen: Screen;
  currentQuestion: number;
  answers: number[];
  promptMode: PromptMode;
}

const SESSION_KEY = "mbai-session";

function defaultState(): SessionState {
  return {
    screen: "home",
    currentQuestion: 0,
    answers: [],
    promptMode: "light",
  };
}

function loadState(): SessionState {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return defaultState();

  try {
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    return {
      screen: parsed.screen ?? "home",
      currentQuestion: parsed.currentQuestion ?? 0,
      answers: Array.isArray(parsed.answers) ? parsed.answers : [],
      promptMode: parsed.promptMode ?? "light",
    };
  } catch {
    return defaultState();
  }
}

export const state: SessionState = loadState();

export function saveState(): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

export function hasInProgressSession(): boolean {
  return state.answers.length > 0 && state.answers.length < questionBank.length;
}

/**
 * 修正越界的 currentQuestion 或与 answers 长度不一致的 result 屏。
 * 返回是否发生过修正（调用方据此决定是否重渲染）。
 */
export function reconcileState(): boolean {
  let changed = false;

  if (
    state.currentQuestion < 0 ||
    state.currentQuestion >= questionBank.length
  ) {
    state.currentQuestion = Math.min(
      Math.max(state.answers.length, 0),
      questionBank.length - 1,
    );
    changed = true;
  }

  if (
    state.screen === "result" &&
    state.answers.length !== questionBank.length
  ) {
    state.screen = state.answers.length > 0 ? "quiz" : "home";
    state.currentQuestion = Math.min(
      state.answers.length,
      questionBank.length - 1,
    );
    changed = true;
  }

  if (changed) saveState();
  return changed;
}
