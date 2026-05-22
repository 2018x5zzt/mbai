import { questionBank } from "../lib/evaluate";
import { state } from "../state";
import type { Option, Question } from "../types";
import { escapeHtml } from "../utils/escape";

/**
 * 把选项 tags 转成审讯式 hint，比如 ["SHOW","RAGE"] → "// SHOW · 晒命狂 · RAGE · 发癫型 触发"
 */
function buildOptionHint(option: Option): string {
  const tagInfo: Record<string, string> = {
    SPAM: "连珠炮", FAKE: "客气式催稿", TROLL: "杠精", CHECK: "不信邪",
    SHOW: "晒命狂", RAGE: "发癫型", CITE: "出处警察", LAZY: "甩锅型",
    RITUAL: "仪式感上头", CHAIN: "接力狂", NOCONTEXT: "上下文裸奔",
    STICKY: "工具恋旧", PATIENT: "佛系体质",
  };
  const masterMap: Record<string, string> = {
    CTRL: "赛博甲方", VOID: "电子树洞", POLY: "模型海王", AGENT: "社交脚替",
    JURY: "云端法官", ORACLE: "玄学媒介", CO: "脑暴搭子", CAST: "剧本演员",
    PAPER: "学术拐杖", DUMP: "报错回收站", LULZ: "梗图工厂", MONO: "钉子户",
  };
  const primary = option.tags[0];
  if (primary && tagInfo[primary]) return `// ${primary} · ${tagInfo[primary]} 触发`;

  const topMaster = Object.entries(option.masterWeights)
    .sort((a, b) => b[1] - a[1])[0];
  if (topMaster && masterMap[topMaster[0]]) {
    return `// ${topMaster[0]} · ${masterMap[topMaster[0]]} 行为`;
  }
  return "// 这条最像你脱口而出的反应";
}

function caseNumber(): string {
  const idx = String(state.currentQuestion + 1).padStart(2, "0");
  return `CASE No. 25Q-${idx}`;
}

function renderRail(progressPercent: number): string {
  const num = String(state.currentQuestion + 1).padStart(2, "0");
  const total = String(questionBank.length).padStart(2, "0");
  const isFirst = state.currentQuestion === 0;

  return `
    <aside class="quiz-rail">
      <div class="quiz-rail__brand">MBAI · 赛博嘴脸图鉴</div>
      <div class="quiz-rail__case">${caseNumber()}</div>

      <div class="quiz-counter">
        <div class="quiz-counter__num">${num}</div>
        <div class="quiz-counter__total">/ ${total}</div>
      </div>
      <div class="step-label">场景审问 · INTERROGATION</div>

      <div class="progress">
        <div class="progress__fill" style="width: ${progressPercent}%"></div>
      </div>
      <div class="progress__ticks">
        <span>00</span><span>·</span><span>·</span><span>·</span><span>${total}</span>
      </div>

      <div class="principle">
        <div class="principle__card">
          <span class="principle__label">答题原则</span>
          <p>凭直觉选，不用自证清白。</p>
        </div>
        <div class="principle__card">
          <span class="principle__label">当前目的</span>
          <p>把你的真实开口习惯<br>钉在 ${total} 个场景上。</p>
        </div>
        <div class="quiz-rail__actions">
          <button class="text-btn" data-action="previous"${isFirst ? " disabled" : ""}>← 上一题</button>
          <button class="text-btn" data-action="reset">↺ 重来</button>
        </div>
      </div>
    </aside>
  `;
}

function renderOption(option: Option, index: number, selected: boolean): string {
  const letter = String.fromCharCode(65 + index);
  return `
    <button class="option${selected ? " option--selected" : ""}" data-option-index="${index}">
      <span class="option__letter">${letter}</span>
      <span class="option__body">
        <span class="option__text">${escapeHtml(option.text)}</span>
        <span class="option__hint">${escapeHtml(buildOptionHint(option))}</span>
      </span>
    </button>
  `;
}

function renderStage(question: Question, selectedIndex: number | undefined): string {
  const num = String(state.currentQuestion + 1).padStart(2, "0");
  const remain = questionBank.length - state.currentQuestion - 1;
  const optionsHtml = question.options
    .map((option, i) => renderOption(option, i, selectedIndex === i))
    .join("");

  return `
    <main class="quiz-stage">
      <div class="quiz-stage__top">
        <span class="quiz-stage__chip">Q${num} · 嘴脸取证</span>
        <span class="quiz-stage__hint">凭直觉选 · 选完自动跳下一题</span>
      </div>

      <h2 class="question display">${escapeHtml(question.text)}</h2>
      <p class="question__sub">
        选最像你平时会做的那个，不选你希望自己看起来比较体面的那个。这不是道德考试。
      </p>

      <div class="options">${optionsHtml}</div>

      <div class="quiz-stage__footer">
        <span>选项即证据 · 你的每一次点击都在被赛博法庭记录</span>
        <span>剩余 <strong>${remain}</strong> 题 · 预计 ${Math.max(remain * 5, 0)}s</span>
      </div>
    </main>
  `;
}

export function renderQuiz(question: Question): string {
  const progressPercent = ((state.currentQuestion + 1) / questionBank.length) * 100;
  const selectedIndex = state.answers[state.currentQuestion];

  return `
    <div class="quiz-layout">
      ${renderRail(progressPercent)}
      ${renderStage(question, selectedIndex)}
    </div>
  `;
}
