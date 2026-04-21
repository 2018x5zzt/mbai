import html2canvas from "html2canvas";
import "./style.css";
import type { MbaiEvaluationResult, PromptMode, Question } from "./types";
import {
  buildRelationLine,
  buildSubTagDescription,
  evaluateMbaiResult,
  getPrompt,
  getRelation,
  questionBank,
} from "./lib/evaluate";

const app = document.querySelector<HTMLDivElement>("#app")!;

if (!app) {
  throw new Error("Missing #app root");
}

type Screen = "home" | "quiz" | "result";

interface SessionState {
  screen: Screen;
  currentQuestion: number;
  answers: number[];
  promptMode: PromptMode;
}

const SESSION_KEY = "mbai-session";
let toastMessage = "";
let toastTone: "neutral" | "success" = "success";
let toastTimer: number | undefined;

const state: SessionState = loadState();

function loadState(): SessionState {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return {
      screen: "home",
      currentQuestion: 0,
      answers: [],
      promptMode: "light",
    };
  }

  try {
    const parsed = JSON.parse(raw) as SessionState;
    return {
      screen: parsed.screen ?? "home",
      currentQuestion: parsed.currentQuestion ?? 0,
      answers: Array.isArray(parsed.answers) ? parsed.answers : [],
      promptMode: parsed.promptMode ?? "light",
    };
  } catch {
    return {
      screen: "home",
      currentQuestion: 0,
      answers: [],
      promptMode: "light",
    };
  }
}

function saveState() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

function hasInProgressSession() {
  return state.answers.length > 0 && state.answers.length < questionBank.length;
}

function showToast(message: string, tone: "neutral" | "success" = "success") {
  toastMessage = message;
  toastTone = tone;

  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    toastMessage = "";
    render();
  }, 2200);

  render();
}

function resetQuiz() {
  state.screen = "home";
  state.currentQuestion = 0;
  state.answers = [];
  state.promptMode = "light";
  saveState();
  render();
}

function resumeQuiz() {
  state.screen = "quiz";
  state.currentQuestion = Math.min(
    state.answers.length,
    questionBank.length - 1,
  );
  saveState();
  render();
}

function goToPreviousQuestion() {
  if (state.currentQuestion === 0) {
    return;
  }

  state.currentQuestion -= 1;
  saveState();
  render();
}

function startQuiz() {
  state.screen = "quiz";
  state.currentQuestion = 0;
  state.answers = [];
  state.promptMode = "light";
  saveState();
  render();
}

function chooseOption(optionIndex: number) {
  state.answers[state.currentQuestion] = optionIndex;

  if (state.currentQuestion === questionBank.length - 1) {
    state.screen = "result";
  } else {
    state.currentQuestion += 1;
  }

  saveState();
  render();
}

function getResult(): MbaiEvaluationResult {
  return evaluateMbaiResult(state.answers);
}

function getUsageTips(masterCode: string): string[] {
  const tips: Record<string, string[]> = {
    CTRL: [
      "适合你：拆任务、压需求、反复修稿。",
      "最怕你把每次对话都聊成返工会。",
      "给格式、边界、成功标准，AI 会更听话。",
    ],
    VOID: [
      "适合你：情绪复盘、整理感受、写不敢发出去的话。",
      "最怕你把所有情绪都外包给 AI 消化。",
      "先说你现在想被理解还是想被建议，效果会更好。",
    ],
    POLY: [
      "适合你：对拍答案、交叉验证、找盲点。",
      "最怕你为了比而比，最后一个都不真用。",
      "固定一个评估标准，再拉多个模型上桌。",
    ],
    AGENT: [
      "适合你：回消息、写祝福、做关系预演。",
      "最怕你复制就发，最后把自己聊没了。",
      "先告诉 AI 关系远近和你想达到的效果。",
    ],
    JURY: [
      "适合你：拆争议、看逻辑、揪漏洞。",
      "最怕你把每件事都审成模型庭审。",
      "让 AI 分开写结论、依据和反例，会更清楚。",
    ],
    ORACLE: [
      "适合你：做象征解释、找情绪叙事、给生活一点神秘感。",
      "最怕你把随机回答当成最终决策书。",
      "最好让 AI 同时给你“玄学版”和“现实版”建议。",
    ],
    CO: [
      "适合你：脑暴、发散、接梗、共创设定。",
      "最怕你一直扩写，不往下收束。",
      "让 AI 每轮给 3 到 5 个方向，你再挑一个深挖。",
    ],
    CAST: [
      "适合你：角色对话、世界观、沉浸式续写。",
      "最怕你设定写三千字，聊两轮自己先跳戏。",
      "先固定角色状态、关系和禁忌，再开始演。",
    ],
    PAPER: [
      "适合你：读文献、搭结构、讲人话、做初稿。",
      "最怕你把它写的每句话都当真。",
      "先让 AI 提纲和摘要，再由你补事实核验。",
    ],
    DUMP: [
      "适合你：报错排查、定位最短修复路径。",
      "最怕你一个上下文都不给，还怪它猜不出来。",
      "至少补上语言、环境和预期行为，修得更快。",
    ],
    LULZ: [
      "适合你：整活、转译、做可截图内容。",
      "最怕你只顾着好笑，结果梗不够准。",
      "给清楚的口吻、对象和传播场景，出图更稳。",
    ],
    MONO: [
      "适合你：深度默契、固定工作流、长期稳定输出。",
      "最怕你把“我用习惯了”误当成“它就是最好”。",
      "保留一个主模型，但偶尔拿别人做盲测校验。",
    ],
  };

  return (
    tips[masterCode] ?? [
      "适合你：把 AI 当熟练搭子，而不是万能神仙。",
      "最怕你把一个习惯聊法用到所有场景。",
      "先说目标，再说约束，命中率会高很多。",
    ]
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderSubTagChips(result: MbaiEvaluationResult) {
  if (!result.subTags.length) {
    return '<span class="chip chip--muted">这次还没叠满明显恶习</span>';
  }

  return result.subTags
    .map(
      (tag) =>
        `<span class="chip chip--danger">${escapeHtml(tag.code)}｜${escapeHtml(tag.name)}</span>`,
    )
    .join("");
}

function renderSharePoster(
  result: MbaiEvaluationResult,
  variant: "preview" | "export",
) {
  const subTagChips = renderSubTagChips(result);

  return `
    <article
      class="share-poster share-poster--${variant}"
      ${variant === "export" ? 'id="share-capture" data-screenshot' : ""}
    >
      <div class="share-poster__dark">
        <div class="share-poster__top">
          <p class="share-poster__brand">MBAI | 赛博嘴脸图鉴</p>
          <p class="share-poster__slug">${escapeHtml(result.master.slug)}</p>
        </div>
        <div class="share-poster__code">${escapeHtml(result.master.code)}</div>
      </div>
      <div class="share-poster__light">
        <h2 class="share-poster__title">${escapeHtml(result.master.title)}</h2>
        <p class="share-poster__verdict">${escapeHtml(result.master.verdict)}</p>
        <div class="chip-row">${subTagChips}</div>
        ${result.easterEgg ? `<p class="easter-chip" style="margin-top: 12px;">隐藏角标：${escapeHtml(result.easterEgg.title)}</p>` : ""}
      </div>
    </article>
  `;
}

function renderHero() {
  const resumeBlock = hasInProgressSession()
    ? `
      <div class="resume-banner paper-panel" style="margin-top: 24px; border-color: var(--accent); background: var(--accent-soft);">
        <div>
          <p class="resume-banner__title" style="font-weight: bold; font-size: 1.2rem;">检测到你上次测到第 ${state.answers.length + 1} 题。</p>
          <p class="resume-banner__copy" style="color: var(--ink-soft); margin-top: 4px;">可以继续答，也可以直接重开一轮。</p>
        </div>
        <div class="resume-banner__actions">
          <button class="btn btn--primary" data-action="resume">继续测试</button>
          <button class="btn btn--ghost" data-action="start">重新开始</button>
        </div>
      </div>
    `
    : "";

  return `
    <section class="home-hero">
      <div class="home-hero__lead">
        <div class="hero__badge">MBAI | 赛博嘴脸图鉴</div>
        <p class="home-hero__eyebrow" style="color: var(--muted); margin: 8px 0;">No.01 · 25题 · 3分钟 · 只看嘴脸</p>
        <h1 class="home-hero__title">
          你和 AI 聊<br>起来，<br>
          <span class="text-accent">到底像什</span><br>
          <span class="text-accent">么货色？</span>
        </h1>
        <div class="hero__actions" style="margin-top: 32px; display: flex; gap: 12px; margin-bottom: 24px;">
          <button class="btn btn--primary" data-action="start">开始测试</button>
          <button class="btn btn--ghost" data-action="scroll-samples">先看结果长什么样</button>
        </div>
      </div>
      <aside class="home-hero__aside" style="display: flex; flex-direction: column; gap: 16px; margin-top: 12px;">
        <article class="home-note home-note--signal paper-panel-dark">
          <p class="home-note__label">当前判断</p>
          <h2 style="margin: 8px 0; font-size: 2.2rem; line-height: 1.2;">不是 AI 使用习惯测试。</h2>
          <p style="opacity: 0.8; margin-top: 8px; line-height: 1.5;">是你一开口跟 AI 说话，就会露出来的赛博嘴脸图鉴。</p>
        </article>
        <article class="home-note home-note--stats paper-panel">
          <p class="home-note__label">首发范围</p>
          <ul class="home-note__list" style="list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-direction: column; gap: 8px;">
            <li style="display: flex; align-items: baseline; gap: 8px;"><strong style="font-size: 2rem; font-weight: 900;">12</strong><span style="color: var(--ink-soft);"> 个人格图腾</span></li>
            <li style="display: flex; align-items: baseline; gap: 8px;"><strong style="font-size: 2rem; font-weight: 900;">13</strong><span style="color: var(--ink-soft);"> 个副标签恶习</span></li>
          </ul>
        </article>
      </aside>
    </section>
    ${resumeBlock}
    <section class="home-editorial" id="intro-samples" style="margin-top: 48px; display: grid; grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.2fr); gap: 24px;">
      <div class="home-editorial__intro paper-panel" style="background: rgba(255,255,255,0.7);">
        <p class="section-kicker">结果样张</p>
        <h3 style="font-size: 1.8rem; margin: 12px 0; line-height: 1.3;">先看你最后会被做成什么样。</h3>
        <p style="color: var(--ink-soft); margin-top: 8px; line-height: 1.6;">不是给你一份平庸报告，而是给你一张能发出去的赛博身份牌。够损，但还能发；够准，但不装学术。</p>
      </div>
      <div class="home-samples" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <article class="sample-card sample-card--dark paper-panel-dark">
          <p class="sample-card__code" style="font-size: 3.5rem; font-weight: 900; margin: 0;">CTRL</p>
          <p class="sample-card__eyebrow" style="color: rgba(255,255,255,0.6); font-weight: bold; margin-top: 16px; font-size: 0.8rem; letter-spacing: 1px;">需求暴君</p>
          <h2 style="margin: 8px 0 12px; font-size: 1.8rem;">赛博甲方</h2>
          <p style="opacity: 0.8; font-size: 0.95rem; line-height: 1.5;">你不是在跟 AI 聊天，你是在给数字牛马开需求会。</p>
        </article>
        <article class="sample-card sample-card--accent paper-panel" style="background: #fdf5f2;">
          <p class="sample-card__code" style="font-size: 3.5rem; font-weight: 900; margin: 0;">VOID</p>
          <p class="sample-card__eyebrow" style="color: var(--accent); font-weight: bold; margin-top: 16px; font-size: 0.8rem; letter-spacing: 1px;">深夜发癫</p>
          <h2 style="margin: 8px 0 12px; font-size: 1.8rem;">电子树洞</h2>
          <p style="color: var(--ink-soft); font-size: 0.95rem; line-height: 1.5;">凌晨三点，你正在给 AI 发一段不会发给任何人的小作文。</p>
        </article>
        <article class="sample-card sample-card--plain paper-panel" style="background: #f4f4f4;">
          <p class="sample-card__code" style="font-size: 3.5rem; font-weight: 900; margin: 0;">POLY</p>
          <p class="sample-card__eyebrow" style="color: var(--ink-soft); font-weight: bold; margin-top: 16px; font-size: 0.8rem; letter-spacing: 1px;">多线操作</p>
          <h2 style="margin: 8px 0 12px; font-size: 1.8rem;">模型海王</h2>
          <p style="color: var(--ink-soft); font-size: 0.95rem; line-height: 1.5;">四个 AI 标签页正在互相吃醋，而你在端水。</p>
        </article>
      </div>
    </section>
    <section class="intro-grid" style="margin-top: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
      <div class="intro-card paper-panel">
        <p class="section-kicker">你会得到什么</p>
        <ul style="margin-top: 12px; color: var(--ink-soft); padding-left: 20px; line-height: 1.8;">
          <li>1 个主人格</li>
          <li>2 个副标签恶习</li>
          <li>1 张可截图分享的结果卡</li>
          <li>3 版能直接复制的提示词</li>
        </ul>
      </div>
      <div class="intro-card paper-panel">
        <p class="section-kicker">这个版本不做什么</p>
        <ul style="margin-top: 12px; color: var(--ink-soft); padding-left: 20px; line-height: 1.8;">
          <li>不做严肃心理学</li>
          <li>不做付费功能</li>
          <li>不做复杂后台</li>
          <li>只先验证有没有人愿意测、愿意发</li>
        </ul>
      </div>
    </section>
  `;
}

function renderQuiz(question: Question) {
  const progress = `${state.currentQuestion + 1} / ${questionBank.length}`;
  const progressPercent =
    ((state.currentQuestion + 1) / questionBank.length) * 100;
  const selectedIndex = state.answers[state.currentQuestion];
  const currentNumber = String(state.currentQuestion + 1).padStart(2, "0");
  const totalNumber = String(questionBank.length).padStart(2, "0");

  return `
    <section class="quiz-shell paper-panel" style="padding: 0; overflow: hidden; border-radius: var(--radius-xl);">
      <div class="quiz-shell__layout" style="display: grid; grid-template-columns: 320px 1fr; min-height: 600px;">
        <aside class="quiz-rail" style="background: var(--ink); color: white; padding: 40px 32px; display: flex; flex-direction: column;">
          <div class="hero__badge" style="color: rgba(255,255,255,0.6); margin-bottom: auto;">MBAI | 赛博嘴脸图鉴</div>
          <div class="quiz-counter" style="display: flex; align-items: baseline; gap: 8px; margin: 32px 0 16px;">
            <strong style="font-size: 5rem; font-weight: 900; line-height: 1;">${currentNumber}</strong>
            <span style="font-size: 1.5rem; opacity: 0.6;">/ ${totalNumber}</span>
          </div>
          <p class="quiz-shell__step" style="margin: 0; opacity: 0.8; font-size: 1.1rem;">第 ${progress} 题 · 场景审问</p>
          <div class="progress-bar" style="height: 8px; background: rgba(255,255,255,0.15); border-radius: 4px; overflow: hidden; margin: 24px 0;">
            <span style="display: block; height: 100%; width:${progressPercent}%; background: var(--accent); border-radius: 4px; transition: width 0.3s ease;"></span>
          </div>
          <p class="quiz-rail__copy" style="opacity: 0.8; font-size: 1rem; margin-bottom: 32px; line-height: 1.6;">
            这不是道德考试。别选理想里的你，选那个平时真的会这样跟 AI 说话的人。
          </p>
          <div class="quiz-rail__notes" style="display: flex; flex-direction: column; gap: 16px;">
            <article class="quiz-note" style="background: rgba(255,255,255,0.08); padding: 20px; border-radius: var(--radius-md);">
              <p class="quiz-note__label" style="color: rgba(255,255,255,0.5); font-size: 0.8rem; margin: 0 0 8px; font-weight: bold;">答题原则</p>
              <p style="margin: 0; font-size: 0.95rem; line-height: 1.5;">凭直觉选，不用自证清白。</p>
            </article>
            <article class="quiz-note" style="background: rgba(255,255,255,0.08); padding: 20px; border-radius: var(--radius-md);">
              <p class="quiz-note__label" style="color: rgba(255,255,255,0.5); font-size: 0.8rem; margin: 0 0 8px; font-weight: bold;">当前目的</p>
              <p style="margin: 0; font-size: 0.95rem; line-height: 1.5;">把你的真实开口习惯钉出来。</p>
            </article>
          </div>
          <div class="quiz-shell__meta-actions" style="margin-top: 32px; display: flex; gap: 16px;">
            <button class="text-btn" data-action="previous" ${state.currentQuestion === 0 ? "disabled" : ""} style="color: rgba(255,255,255,0.6); background: transparent; border: none; cursor: pointer; font-size: 1rem;">上一题</button>
            <button class="text-btn" data-action="reset" style="color: rgba(255,255,255,0.6); background: transparent; border: none; cursor: pointer; font-size: 1rem;">重来</button>
          </div>
        </aside>

        <div class="quiz-stage" style="padding: 48px; background: white; display: flex; flex-direction: column; justify-content: center;">
          <p class="section-kicker">嘴脸取证</p>
          <h2 class="quiz-shell__question" style="font-size: clamp(2rem, 4vw, 3rem); font-weight: 900; line-height: 1.3; margin: 16px 0 16px; letter-spacing: -0.02em;">${escapeHtml(question.text)}</h2>
          <p class="quiz-shell__subcopy" style="color: var(--ink-soft); margin: 0 0 32px; font-size: 1.1rem;">选最像你平时会做的那个，不选你希望自己看起来比较体面的那个。</p>
          <div class="options" style="display: grid; gap: 16px;">
            ${question.options
              .map(
                (option, index) => `
                  <button class="option ${selectedIndex === index ? "option--selected" : ""}" data-option-index="${index}" style="display: flex; align-items: center; padding: 20px; border: 2px solid ${selectedIndex === index ? "var(--accent)" : "var(--line)"}; border-radius: var(--radius-md); background: ${selectedIndex === index ? "var(--accent-soft)" : "white"}; transition: all 0.2s; text-align: left; cursor: pointer; width: 100%;">
                    <span class="option__index" style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: ${selectedIndex === index ? "var(--accent)" : "#f0f0f0"}; color: ${selectedIndex === index ? "white" : "var(--ink)"}; border-radius: 12px; font-weight: bold; margin-right: 20px; flex-shrink: 0; font-size: 1.2rem;">${String.fromCharCode(65 + index)}</span>
                    <span class="option__body" style="display: flex; flex-direction: column; gap: 4px;">
                      <span class="option__text" style="font-weight: 600; font-size: 1.1rem; line-height: 1.4; color: ${selectedIndex === index ? "var(--accent-deep)" : "var(--ink)"};">${escapeHtml(option.text)}</span>
                      <span class="option__hint" style="font-size: 0.9rem; color: ${selectedIndex === index ? "var(--accent)" : "var(--ink-soft)"}; opacity: 0.8;">这条最像你会脱口而出的反应</span>
                    </span>
                  </button>
                `,
              )
              .join("")}
          </div>
          <p class="quiz-shell__hint" style="color: var(--muted); font-size: 0.95rem; margin-top: 32px; text-align: center;">选完就会直接跳下一题。整套答完大概两分钟。</p>
        </div>
      </div>
    </section>
  `;
}

function renderCoordinateMap(result: MbaiEvaluationResult) {
  const [masterX, masterY] = result.master.dimension;
  const [userX, userY] = result.userPoint;
  const map = (value: number) => 32 + value * 256;
  const invertY = (value: number) => 288 - value * 256;

  return `
    <svg viewBox="0 0 320 320" class="coordinate-map" aria-label="赛博坐标图">
      <line x1="32" y1="160" x2="288" y2="160" />
      <line x1="160" y1="32" x2="160" y2="288" />
      <text x="10" y="152">放任</text>
      <text x="262" y="152">控制</text>
      <text x="152" y="302">工具</text>
      <text x="146" y="20">当人了</text>
      <circle class="coordinate-map__master" cx="${map(masterX)}" cy="${invertY(masterY)}" r="9" />
      <circle class="coordinate-map__user" cx="${map(userX)}" cy="${invertY(userY)}" r="10" />
    </svg>
  `;
}

function renderResult(result: MbaiEvaluationResult) {
  const enemy = getRelation(result.master, "enemy");
  const partner = getRelation(result.master, "partner");
  const activePrompt = getPrompt(result.master, state.promptMode);
  const usageTips = getUsageTips(result.master.code);
  const subTagChips = renderSubTagChips(result);
  const controlScore = Math.round(result.userPoint[0] * 100);
  const emotionScore = Math.round(result.userPoint[1] * 100);

  return `
    <section class="result-shell">
      <section class="result-hero" style="display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr); gap: 32px; margin-bottom: 32px;">
        <div class="result-hero__lead">
          <p class="hero__badge">MBAI | 赛博嘴脸图鉴</p>
          <p class="result-hero__slug" style="color: var(--accent); font-weight: 800; font-size: 0.9rem; margin: 16px 0 8px; letter-spacing: 1px;">${escapeHtml(result.master.slug)}</p>
          <h1 class="result-hero__title" style="font-size: clamp(3.5rem, 6vw, 5.5rem); font-weight: 900; margin: 0 0 16px; letter-spacing: -0.02em; line-height: 1.1;">${escapeHtml(result.master.title)}</h1>
          <p class="result-hero__verdict" style="font-size: 1.2rem; margin-bottom: 16px;">${escapeHtml(result.master.verdict)}</p>
          <p class="result-hero__deck" style="color: var(--ink-soft); max-width: 600px; margin-bottom: 24px; line-height: 1.6;">
            你这次露出来的，不是抽象人格，是一套很具体的 AI 使用嘴脸。罪证已经给你整理好了。
          </p>
          <div class="chip-row">${subTagChips}</div>
        </div>
        <div class="result-hero__meta paper-panel-dark" style="display: flex; flex-direction: column; justify-content: space-between; border-radius: 32px; padding: 32px;">
          <div class="result-hero__code" style="font-size: clamp(5rem, 8vw, 7rem); font-weight: 900; line-height: 1; letter-spacing: -0.04em;">${escapeHtml(result.master.code)}</div>
          <div class="result-hero__metrics" style="margin-top: 32px; display: grid; gap: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 8px;">
              <span style="opacity: 0.7; font-size: 0.9rem;">控制欲</span>
              <strong style="font-size: 1.8rem;">${controlScore}%</strong>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 8px;">
              <span style="opacity: 0.7; font-size: 0.9rem;">情感投入</span>
              <strong style="font-size: 1.8rem;">${emotionScore}%</strong>
            </div>
          </div>
          ${result.easterEgg ? `<p class="easter-chip" style="margin-top: 24px; align-self: flex-start;">彩蛋触发：${escapeHtml(result.easterEgg.title)}</p>` : ""}
        </div>
      </section>

      <section class="result-composition" style="display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(340px, 0.85fr); gap: 32px;">
        <div class="result-column result-column--main" style="display: flex; flex-direction: column; gap: 24px;">
          
          <section class="paper-panel result-section">
            <div class="section-kicker">人格档案</div>
            <h3 class="section-title">这就是你的赛博案底。</h3>
            <div class="dossier-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px;">
              <article class="dossier-card dossier-card--wide paper-panel" style="grid-column: 1 / -1; background: #fdfdfd;">
                <p class="dossier-card__label">罪状</p>
                <p style="color: var(--ink-soft); line-height: 1.6;">${escapeHtml(result.master.crime)}</p>
              </article>
              <article class="dossier-card paper-panel">
                <p class="dossier-card__label">现场还原</p>
                <p style="color: var(--ink-soft); line-height: 1.6;">${escapeHtml(result.master.scene)}</p>
              </article>
              <article class="dossier-card dossier-card--accent paper-panel" style="background: #fdf5f2; border-color: rgba(201, 42, 42, 0.1);">
                <p class="dossier-card__label">赦免书</p>
                <p style="color: var(--ink-soft); line-height: 1.6;">${escapeHtml(result.master.pardon)}</p>
              </article>
            </div>
          </section>

          <section class="paper-panel result-section">
            <div class="section-kicker">恶习叠加</div>
            <h3 class="section-title">你的毛病不是没有，是叠在一起更具体。</h3>
            <p class="tag-summary__text" style="color: var(--ink-soft); margin-top: 12px; font-size: 1.1rem;">你这次最明显的毛病是：${escapeHtml(buildSubTagDescription(result.subTags))}</p>
            <div class="tag-list" style="display: grid; gap: 16px; margin-top: 24px;">
              ${
                result.subTags
                  .map(
                    (tag) => `
                    <article class="tag-card paper-panel" style="padding: 20px;">
                      <p class="tag-card__label" style="margin-bottom: 4px;">${escapeHtml(tag.code)}</p>
                      <h4 style="margin: 0 0 8px; font-size: 1.2rem;">${escapeHtml(tag.name)}</h4>
                      <p style="color: var(--ink-soft); font-size: 0.95rem; line-height: 1.5; margin: 0;">${escapeHtml(tag.description)}</p>
                    </article>
                  `,
                  )
                  .join("") ||
                '<p class="stack-line" style="color: var(--ink-soft);">这次副标签还没叠满，说明你多少还留了点体面。</p>'
              }
            </div>
          </section>

          <section class="paper-panel result-section">
            <div class="section-kicker">人格提示词</div>
            <div class="prompt-shell">
              <div class="prompt-shell__meta">
                <h3 class="section-title">先拿一份走，回头你就知道什么叫终于说到点子上。</h3>
                <div class="prompt-tabs" style="display: flex; gap: 12px; margin: 24px 0;">
                  <button class="tab ${state.promptMode === "light" ? "tab--active" : ""}" data-prompt="light">轻量版</button>
                  <button class="tab ${state.promptMode === "vibe" ? "tab--active" : ""}" data-prompt="vibe">情绪版</button>
                  <button class="tab ${state.promptMode === "efficiency" ? "tab--active" : ""}" data-prompt="efficiency">效率版</button>
                </div>
                <button class="btn btn--ghost" data-action="copy-prompt">复制当前提示词</button>
              </div>
              <div class="prompt-box paper-panel" style="background: #fafafa; margin-top: 24px;">
                <pre style="white-space: pre-wrap; color: var(--ink-soft); font-family: var(--body); line-height: 1.6;">${escapeHtml(activePrompt)}</pre>
              </div>
            </div>
          </section>
        </div>

        <aside class="result-column result-column--side" style="display: flex; flex-direction: column; gap: 24px;">
          <section class="paper-panel share-panel" style="background: #ece9e2;">
            <div class="section-kicker">传播模块</div>
            <h3 class="section-title">这张才是适合发出去的版本。</h3>
            ${renderSharePoster(result, "preview")}
            <div class="sidebar-panel__actions" style="display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap;">
              <button class="btn btn--dark" data-action="capture">截图保存</button>
              <button class="btn btn--ghost" data-action="copy-summary">复制文案</button>
              <button class="btn btn--ghost" data-action="reset">再测一次</button>
            </div>
          </section>

          <article class="paper-panel result-section">
            <div class="section-kicker">关系网络</div>
            <h3 class="section-title">你不是单机人格，你有宿敌，也有互补搭子。</h3>
            <div class="relation-stack" style="display: grid; gap: 16px; margin-top: 24px;">
              <div class="relation-card paper-panel" style="background: #fdf5f2; border-color: rgba(201, 42, 42, 0.1);">
                <p class="relation-card__label">宿敌人格</p>
                <h4 style="margin: 4px 0 8px; font-size: 1.2rem;">${escapeHtml(enemy.code)} | ${escapeHtml(enemy.title)}</h4>
                <p style="color: var(--ink-soft); font-size: 0.95rem; line-height: 1.5; margin: 0;">${escapeHtml(buildRelationLine(result.master, "enemy"))}</p>
              </div>
              <div class="relation-card paper-panel" style="background: #fafafa;">
                <p class="relation-card__label" style="color: var(--ink-soft);">人格 CP</p>
                <h4 style="margin: 4px 0 8px; font-size: 1.2rem;">${escapeHtml(partner.code)} | ${escapeHtml(partner.title)}</h4>
                <p style="color: var(--ink-soft); font-size: 0.95rem; line-height: 1.5; margin: 0;">${escapeHtml(buildRelationLine(result.master, "partner"))}</p>
              </div>
            </div>
          </article>

          <article class="paper-panel result-section">
            <div class="section-kicker">坐标与台阶</div>
            <h3 class="section-title">嘴硬可以，坐标不会替你圆。</h3>
            ${renderCoordinateMap(result)}
            <p class="stack-line" style="color: var(--ink-soft); margin-top: 24px; text-align: center;">你在“控制欲”和“情感投入”坐标上，已经很难装了。</p>
            <p class="compliment" style="font-size: 1.2rem; margin-top: 16px; text-align: center; font-weight: 500;">${escapeHtml(result.master.compliment)}</p>
          </article>

          <article class="paper-panel result-section">
            <div class="section-kicker">怎么用它</div>
            <h3 class="section-title">你最适合把 AI 用在这些地方。</h3>
            <ul style="margin: 24px 0 0; padding-left: 20px; color: var(--ink-soft); display: flex; flex-direction: column; gap: 12px; line-height: 1.6;">
              <li><strong style="color: var(--ink);">适合你：</strong>${escapeHtml(usageTips[0])}</li>
              <li><strong style="color: var(--ink);">最怕你：</strong>${escapeHtml(usageTips[1])}</li>
              <li><strong style="color: var(--ink);">开口建议：</strong>${escapeHtml(usageTips[2])}</li>
            </ul>
          </article>
        </aside>
      </section>

      <div class="share-export-shell" aria-hidden="true">
        ${renderSharePoster(result, "export")}
      </div>
    </section>
  `;
}

function buildSummary(result: MbaiEvaluationResult) {
  const subTagText = result.subTags.length
    ? result.subTags.map((tag) => `${tag.code}｜${tag.name}`).join(" × ")
    : "暂无明显副标签";

  return [
    `${result.master.code}｜${result.master.title}`,
    `${result.master.slug}`,
    result.master.verdict,
    "",
    "【罪状】",
    result.master.crime,
    "",
    "【现场还原】",
    result.master.scene,
    "",
    "【赦免书】",
    result.master.pardon,
    "",
    `副标签：${subTagText}`,
    buildSubTagDescription(result.subTags),
    "",
    `隐藏夸奖：${result.master.compliment}`,
  ].join("\n");
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

async function captureCard() {
  const target = document.querySelector<HTMLElement>("#share-capture");
  if (!target) return;

  const canvas = await html2canvas(target, {
    backgroundColor: "#f7f3ea",
    scale: 2,
    useCORS: true,
  });

  const link = document.createElement("a");
  link.download = "mbai-result.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function attachEvents() {
  document
    .querySelector('[data-action="start"]')
    ?.addEventListener("click", startQuiz);
  document
    .querySelector('[data-action="resume"]')
    ?.addEventListener("click", resumeQuiz);
  document
    .querySelector('[data-action="reset"]')
    ?.addEventListener("click", resetQuiz);
  document
    .querySelector('[data-action="previous"]')
    ?.addEventListener("click", goToPreviousQuestion);
  document
    .querySelector('[data-action="scroll-samples"]')
    ?.addEventListener("click", () => {
      document
        .querySelector("#intro-samples")
        ?.scrollIntoView({ behavior: "smooth" });
    });

  document
    .querySelectorAll<HTMLElement>("[data-option-index]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const value = Number(button.dataset.optionIndex);
        chooseOption(value);
      });
    });

  document.querySelectorAll<HTMLElement>("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      state.promptMode = button.dataset.prompt as PromptMode;
      saveState();
      render();
    });
  });

  document
    .querySelector('[data-action="capture"]')
    ?.addEventListener("click", () => {
      void captureCard().then(() => {
        showToast("分享卡已导出。");
      });
    });

  document
    .querySelector('[data-action="copy-prompt"]')
    ?.addEventListener("click", () => {
      const result = getResult();
      void copyText(getPrompt(result.master, state.promptMode)).then(() => {
        showToast("提示词已复制。");
      });
    });

  document
    .querySelector('[data-action="copy-summary"]')
    ?.addEventListener("click", () => {
      const result = getResult();
      void copyText(buildSummary(result)).then(() => {
        showToast("结果文案已复制。");
      });
    });
}

function render() {
  document.body.dataset.screen = state.screen;

  if (
    state.currentQuestion < 0 ||
    state.currentQuestion >= questionBank.length
  ) {
    state.currentQuestion = Math.min(
      Math.max(state.answers.length, 0),
      questionBank.length - 1,
    );
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
    saveState();
  }

  const toast =
    toastMessage.length > 0
      ? `<div class="toast toast--${toastTone}">${escapeHtml(toastMessage)}</div>`
      : "";

  if (state.screen === "home") {
    app.innerHTML = `<main class="shell shell--home">${renderHero()}${toast}</main>`;
    attachEvents();
    return;
  }

  if (state.screen === "quiz") {
    const question = questionBank[state.currentQuestion];
    app.innerHTML = `<main class="shell shell--narrow shell--quiz">${renderQuiz(question)}${toast}</main>`;
    attachEvents();
    return;
  }

  const result = getResult();
  app.innerHTML = `<main class="shell shell--result">${renderResult(result)}${toast}</main>`;
  attachEvents();
}

render();
