import { escapeHtml } from "./utils/escape";

export type ToastTone = "neutral" | "success";

const TOAST_DURATION_MS = 2200;

let toastMessage = "";
let toastTone: ToastTone = "success";
let toastTimer: number | undefined;

export function showToast(
  message: string,
  tone: ToastTone,
  onChange: () => void,
): void {
  toastMessage = message;
  toastTone = tone;

  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    toastMessage = "";
    onChange();
  }, TOAST_DURATION_MS);

  onChange();
}

export function renderToast(): string {
  if (toastMessage.length === 0) return "";
  return `<div class="toast toast--${toastTone}">${escapeHtml(toastMessage)}</div>`;
}
