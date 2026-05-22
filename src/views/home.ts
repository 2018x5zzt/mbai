import { masterBank, questionBank, subTagBank } from "../lib/evaluate";
import { hasInProgressSession, state } from "../state";
import { escapeHtml } from "../utils/escape";

const SAMPLE_CODES = ["CTRL", "VOID", "POLY"] as const;
const SAMPLE_CASE_NUMBERS = ["No.04", "No.11", "No.07"] as const;
const SAMPLE_TAG_STACKS: Record<string, string> = {
  CTRL: "CTRL × SPAM × RAGE",
  VOID: "VOID × PATIENT × NOCONTEXT",
  POLY: "POLY × CHECK × CHAIN",
};

function renderAlertBand(): string {
  return `
    <div class="alert-band">
      <div class="alert-band__left">
        <span class="alert-band__pulse"></span>
        <span>MBAI · 赛博嘴脸图鉴 No.01</span>
      </div>
      <div class="alert-band__right">
        <span>FILE OPEN · 2026.05</span>
        <span>仅本地计算 · 不传服务器</span>
      </div>
    </div>
  `;
}

function renderResume(): string {
  if (!hasInProgressSession()) return "";
  const at = state.answers.length + 1;
  return `
    <div class="resume-banner">
      <div>
        <p class="resume-banner__title">检测到上次测到第 ${at} 题。</p>
        <p class="resume-banner__copy">可以继续答，也可以直接重开一轮。</p>
      </div>
      <div class="resume-banner__actions">
        <button class="btn btn--small" data-action="resume">继续审问</button>
        <button class="btn btn--small btn--ghost" data-action="start">重新开始</button>
      </div>
    </div>
  `;
}

function renderHero(): string {
  return `
    <section class="hero">
      <h1 class="hero__title display">
        你跟AI<br>
        聊起来，<br>
        到底像<br>
        <em>什么货色</em><br>
        <span class="strike">？</span>
      </h1>
      <div class="hero__meta">
        <div class="case-stamp">
          <div class="case-stamp__title">MBAI<br>CASE FILE</div>
          <div class="case-stamp__no">N°01</div>
          <div class="case-stamp__sub">SUBJECT · 你</div>
        </div>
        <div class="meta-block">
          <div class="meta-block__label">当前判断</div>
          <h2>不是 AI 使用习惯测试。</h2>
          <p>是你一开口跟 AI 说话，<br>就会露出来的赛博嘴脸图鉴。</p>
        </div>
      </div>
    </section>
  `;
}

function renderSub(): string {
  return `
    <section class="sub">
      <p class="sub__copy">
        毒舌、犀利、自带 hook。<span class="hl">${questionBank.length} 道单选题</span>，<span class="hl">3 分钟</span>测完你跟 AI 聊天时露出的真实嘴脸，生成一张<span class="hl">可截图发圈</span>的赛博身份牌。
      </p>
      <div class="sub__ledger">
        <div>题目数 <span>${questionBank.length}</span></div>
        <div>主人格 <span>${masterBank.length}</span></div>
        <div>副标签恶习 <span>${subTagBank.length}</span></div>
        <div>隐藏彩蛋 <span>3</span></div>
        <div>预计耗时 <span>02:47</span></div>
      </div>
    </section>
  `;
}

function renderCta(): string {
  return `
    <div class="cta-row">
      <button class="btn" data-action="start">${hasInProgressSession() ? "重测一遍 ▸" : "开始测试 ▸"}</button>
      <button class="btn btn--ghost" data-action="scroll-samples">先看样张 ↓</button>
      <div class="btn-meta">
        所有数据本地计算<br>
        / 不存服务器 / 不需登录
      </div>
    </div>
  `;
}

function renderSamples(): string {
  const cards = SAMPLE_CODES.map((code, i) => {
    const master = masterBank.find((m) => m.code === code);
    if (!master) return "";
    const variant = ["a", "b", "c"][i];
    return `
      <div class="sample sample--${variant}">
        <span class="sample__chip">CASE ${SAMPLE_CASE_NUMBERS[i]}</span>
        <div>
          <div class="sample__code">${escapeHtml(master.code)}</div>
          <div class="sample__title">${escapeHtml(master.title)}</div>
          <p class="sample__verdict">${escapeHtml(master.verdict)}</p>
        </div>
        <div class="sample__foot">${escapeHtml(SAMPLE_TAG_STACKS[code] ?? master.code)}</div>
      </div>
    `;
  }).join("");

  return `
    <section class="samples" id="intro-samples">
      <div class="samples__header">
        <span class="samples__kicker">SAMPLE EVIDENCE · 03</span>
        <h3 class="samples__title">先看你最后会被<span class="samples__strike">做成</span>判成什么样。</h3>
      </div>
      <div class="sample-grid">${cards}</div>
    </section>
  `;
}

function renderNotes(): string {
  return `
    <section class="notes">
      <div class="note">
        <span class="note__label">你会得到 / WHAT YOU GET</span>
        <ul>
          <li>1 个主人格（${masterBank.length} 选 1，自带毒舌判词）</li>
          <li>2 个副标签恶习（${subTagBank.length} 选 2，叠加你的坏习惯）</li>
          <li>1 张 1080×1350 可截图的赛博案底</li>
          <li>3 版能直接复制的提示词</li>
        </ul>
      </div>
      <div class="note">
        <span class="note__label">注意事项 / DISCLAIMER</span>
        <ul>
          <li>不是严肃心理学，别拿来当诊断书</li>
          <li>所有数据只在你浏览器里算，不存服务器</li>
          <li>觉得准是巧合，觉得不准——那才正常</li>
          <li>截图发出去自负风险，朋友圈翻车不退款</li>
        </ul>
      </div>
    </section>
  `;
}

function renderFooter(): string {
  return `
    <div class="footer-band">
      <span>MBAI · 赛博嘴脸图鉴</span>
      <span>v1.2 · NO ANALYTICS · NO TRACKING</span>
    </div>
  `;
}

export function renderHome(): string {
  return `
    ${renderAlertBand()}
    <main class="shell">
      ${renderHero()}
      ${renderResume()}
      ${renderSub()}
      ${renderCta()}
      ${renderSamples()}
      ${renderNotes()}
      ${renderFooter()}
    </main>
  `;
}
