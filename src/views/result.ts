import {
  buildRelationLine,
  buildSubTagDescription,
  getPrompt,
  getRelation,
  questionBank,
} from "../lib/evaluate";
import { getUsageTips } from "../lib/usage-tips";
import { state } from "../state";
import type { MbaiEvaluationResult, PromptMode } from "../types";
import { escapeHtml } from "../utils/escape";

type PosterVariant = "preview" | "export";

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function caseFileNo(answers: number[]): string {
  // 用回答指纹做一个稳定的 case number，不依赖时间
  let h = 0;
  answers.forEach((a, i) => { h = (h * 31 + a + i) % 100000; });
  return String(h).padStart(3, "0");
}

function renderTopBand(result: MbaiEvaluationResult): string {
  const fileNo = caseFileNo(state.answers);
  return `
    <div class="alert-band">
      <div class="alert-band__left">
        <span class="alert-band__pulse"></span>
        <span>MBAI · 赛博嘴脸图鉴 · CASE FILED</span>
      </div>
      <div class="alert-band__right">
        <span>VERDICT · ${todayString()} · N°${fileNo}</span>
        <span>${escapeHtml(result.master.code)} · ${escapeHtml(result.master.title)}</span>
      </div>
    </div>
  `;
}

function renderChips(result: MbaiEvaluationResult): string {
  if (!result.subTags.length) {
    return '<span class="chip chip--muted">这次还没叠满明显恶习</span>';
  }
  const items = result.subTags
    .map((tag) => `<span class="chip">${escapeHtml(tag.code)} · ${escapeHtml(tag.name)}</span>`)
    .join("");
  const egg = result.easterEgg
    ? `<span class="chip chip--y">🥚 隐藏：${escapeHtml(result.easterEgg.title)}</span>`
    : "";
  return items + egg;
}

function renderShareCard(result: MbaiEvaluationResult, variant: PosterVariant): string {
  const fileNo = caseFileNo(state.answers);
  const ctrlPct = Math.round(result.userPoint[0] * 100);
  const emoPct = Math.round(result.userPoint[1] * 100);
  const exportAttrs = variant === "export" ? 'id="share-capture" data-screenshot' : "";

  return `
    <div class="share-card" ${exportAttrs}>
      <div class="share-card__top">
        <span>CASE FILE N°${fileNo} · 嘴脸已存档</span>
        <span>赛博法庭 · ${todayString()}</span>
      </div>

      <div class="share-card__brand">SUBJECT · YOU · MBAI 终审判决</div>
      <div class="share-card__code">${escapeHtml(result.master.code)}</div>
      <div class="share-card__title-row">
        <span class="share-card__title">${escapeHtml(result.master.title)}</span>
        <span class="share-card__slug">${escapeHtml(result.master.slug)}</span>
      </div>

      <p class="share-card__verdict">${escapeHtml(result.master.verdict)}</p>

      <div class="metrics">
        <div class="metric">
          <div class="metric__label">控制欲 / CTRL</div>
          <div class="metric__value">${ctrlPct}%</div>
          <div class="metric__bar" style="--w: ${ctrlPct}%"></div>
        </div>
        <div class="metric">
          <div class="metric__label">情感投入 / EMO</div>
          <div class="metric__value">${emoPct}%</div>
          <div class="metric__bar" style="--w: ${emoPct}%"></div>
        </div>
      </div>

      <div class="chip-row">${renderChips(result)}</div>

      <div class="stamp">
        <div class="stamp__top">CASE</div>
        <div class="stamp__main">已取证</div>
        <div class="stamp__bot">MBAI · CLOSED</div>
      </div>

      <div class="share-card__foot">
        mbai · ${questionBank.length}Q / 3min<br>
        <strong>本地计算 · 仅你自己看得见</strong>
      </div>
    </div>
  `;
}

function renderShareCardWrap(result: MbaiEvaluationResult): string {
  return `
    <div class="share-card-wrap">
      <div class="share-card-label">↓ 这一张就是<span class="hl">可截图</span>发圈的版本 · 1080×1350</div>
      ${renderShareCard(result, "preview")}
    </div>
  `;
}

function renderDossier(result: MbaiEvaluationResult): string {
  return `
    <section class="section">
      <div class="section__kicker">人格档案 · DOSSIER</div>
      <h3 class="section__title">这就是你的<span class="hl">赛博案底</span>。</h3>
      <div class="dossier">
        <div class="dossier__cell dossier__cell--accent">
          <div class="dossier__label">罪状 / CRIME</div>
          <p>${escapeHtml(result.master.crime)}</p>
        </div>
        <div class="dossier__cell">
          <div class="dossier__label">现场还原 / SCENE</div>
          <p>${escapeHtml(result.master.scene)}</p>
        </div>
        <div class="dossier__cell dossier__cell--dark">
          <div class="dossier__label">赦免书 / PARDON</div>
          <p>${escapeHtml(result.master.pardon)}</p>
        </div>
      </div>
    </section>
  `;
}

function renderSubTagSection(result: MbaiEvaluationResult): string {
  const tagCards = result.subTags
    .map((tag) => `
      <div class="tag-card">
        <span class="tag-card__chip">${escapeHtml(tag.code)} · WEIGHT ${tag.weight.toFixed(1)}</span>
        <h4>${escapeHtml(tag.name)}</h4>
        <p>${escapeHtml(tag.description)}</p>
      </div>
    `)
    .join("");

  const fallback =
    '<div class="tag-card"><h4>这次没叠满</h4><p>说明你多少还留了点体面。</p></div>';

  return `
    <section class="section">
      <div class="section__kicker">恶习叠加 · STACK</div>
      <h3 class="section__title">你的毛病不是没有，<span class="hl">是叠在一起更具体</span>。</h3>
      <p class="tag-summary">${escapeHtml(buildSubTagDescription(result.subTags))}</p>
      <div class="tags-grid">${tagCards || fallback}</div>
    </section>
  `;
}

function renderPromptSection(result: MbaiEvaluationResult): string {
  const tab = (mode: PromptMode, label: string) =>
    `<button class="prompt-tab${state.promptMode === mode ? " prompt-tab--active" : ""}" data-prompt="${mode}">${label}</button>`;
  const active = getPrompt(result.master, state.promptMode);

  return `
    <section class="section">
      <div class="section__kicker">人格提示词 · PROMPT</div>
      <h3 class="section__title">先拿一份走，<span class="hl">回头你就知道什么叫终于说到点子上</span>。</h3>
      <div class="prompt-card">
        <div class="prompt-tabs">
          ${tab("light", "轻量版")}
          ${tab("vibe", "情绪版")}
          ${tab("efficiency", "效率版")}
        </div>
        <pre class="prompt-body">${escapeHtml(active)}</pre>
      </div>
      <div class="prompt-actions">
        <button class="btn btn--small btn--ghost" data-action="copy-prompt">复制当前提示词</button>
      </div>
    </section>
  `;
}

function renderRelations(result: MbaiEvaluationResult): string {
  const enemy = getRelation(result.master, "enemy");
  const partner = getRelation(result.master, "partner");

  return `
    <section class="section">
      <div class="section__kicker">关系网络 · RELATIONS</div>
      <h3 class="section__title">你不是单机人格，<span class="hl">你有宿敌，也有互补搭子</span>。</h3>
      <div class="relations">
        <div class="relation relation--enemy">
          <div class="relation__label">宿敌人格 / NEMESIS</div>
          <h4>${escapeHtml(enemy.code)} · ${escapeHtml(enemy.title)}</h4>
          <p>${escapeHtml(buildRelationLine(result.master, "enemy"))}</p>
        </div>
        <div class="relation relation--cp">
          <div class="relation__label">人格 CP / PARTNER</div>
          <h4>${escapeHtml(partner.code)} · ${escapeHtml(partner.title)}</h4>
          <p>${escapeHtml(buildRelationLine(result.master, "partner"))}</p>
        </div>
      </div>
    </section>
  `;
}

function renderCoordinate(result: MbaiEvaluationResult): string {
  const [mx, my] = result.master.dimension;
  const [ux, uy] = result.userPoint;
  const map = (v: number) => 32 + v * 256;
  const flipY = (v: number) => 288 - v * 256;
  const ctrlPct = Math.round(ux * 100);
  const emoPct = Math.round(uy * 100);

  return `
    <section class="section">
      <div class="section__kicker">控制 × 情感 · COORDINATE</div>
      <h3 class="section__title">嘴硬可以，<span class="hl">坐标不会替你圆</span>。</h3>
      <div class="coord-wrap">
        <div class="coord">
          <svg viewBox="0 0 320 320" class="coordinate-map" aria-label="赛博坐标图">
            <line x1="32" y1="160" x2="288" y2="160" />
            <line x1="160" y1="32" x2="160" y2="288" />
            <text x="14" y="16">当人</text>
            <text x="266" y="16">控制</text>
            <text x="14" y="312">放任</text>
            <text x="266" y="312">工具</text>
            <circle class="coordinate-map__master" cx="${map(mx)}" cy="${flipY(my)}" r="6" />
            <circle class="coordinate-map__user-ring" cx="${map(ux)}" cy="${flipY(uy)}" r="14" />
            <circle class="coordinate-map__user" cx="${map(ux)}" cy="${flipY(uy)}" r="6" />
          </svg>
        </div>
        <div class="coord-legend">
          <p>
            <span class="dot dot--user"></span>你 = <strong>(${(ux).toFixed(2)}, ${(uy).toFixed(2)})</strong><br>
            <span class="dot dot--master"></span>${escapeHtml(result.master.code)} 中心 = (${mx.toFixed(2)}, ${my.toFixed(2)})<br><br>
            你在控制欲 ${ctrlPct}% / 情感投入 ${emoPct}% 这个位置。<br>
            ${escapeHtml(result.master.compliment)}
          </p>
        </div>
      </div>
    </section>
  `;
}

function renderUsage(result: MbaiEvaluationResult): string {
  const [t1, t2, t3] = getUsageTips(result.master.code);
  return `
    <section class="section">
      <div class="section__kicker">怎么用它 · USAGE</div>
      <h3 class="section__title">你最适合<span class="hl">把 AI 用在这些地方</span>。</h3>
      <ul class="usage-list">
        <li data-label="适合你">${escapeHtml(t1)}</li>
        <li data-label="最怕你">${escapeHtml(t2)}</li>
        <li data-label="开口建议">${escapeHtml(t3)}</li>
      </ul>
    </section>
  `;
}

function renderActions(): string {
  return `
    <section class="section">
      <div class="section__kicker">下一步 · ACTIONS</div>
      <h3 class="section__title">截图带走，<span class="hl">或者重新审一遍</span>。</h3>
      <div class="actions">
        <button class="btn btn--dark" data-action="capture">↓ 截图保存 PNG</button>
        <button class="btn" data-action="copy-summary">复制结果文案</button>
        <button class="btn btn--ghost" data-action="copy-prompt">复制提示词</button>
        <button class="btn btn--ghost" data-action="reset">再测一次</button>
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

export function renderResult(result: MbaiEvaluationResult): string {
  return `
    ${renderTopBand(result)}
    <main class="shell">
      ${renderShareCardWrap(result)}
      <div class="detail-header">
        <h2 class="detail-header__title">以下是<span class="strike">温和的</span>给你的赛博案底详情。</h2>
        <span class="detail-header__meta">EXTENDED · ONLY FOR YOU · 不在分享卡内</span>
      </div>
      ${renderDossier(result)}
      ${renderSubTagSection(result)}
      ${renderPromptSection(result)}
      ${renderRelations(result)}
      ${renderCoordinate(result)}
      ${renderUsage(result)}
      ${renderActions()}
      ${renderFooter()}
    </main>
    <div class="share-export-shell" aria-hidden="true">
      ${renderShareCard(result, "export")}
    </div>
  `;
}

export function buildSummary(result: MbaiEvaluationResult): string {
  const subTagText = result.subTags.length
    ? result.subTags.map((tag) => `${tag.code}｜${tag.name}`).join(" × ")
    : "暂无明显副标签";
  const ctrlPct = Math.round(result.userPoint[0] * 100);
  const emoPct = Math.round(result.userPoint[1] * 100);

  return [
    `${result.master.code}｜${result.master.title}`,
    result.master.slug,
    result.master.verdict,
    "",
    `控制欲 ${ctrlPct}% · 情感投入 ${emoPct}%`,
    `副标签：${subTagText}`,
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
    buildSubTagDescription(result.subTags),
    "",
    `隐藏夸奖：${result.master.compliment}`,
    "",
    "—— mbai · 赛博嘴脸图鉴",
  ].join("\n");
}
