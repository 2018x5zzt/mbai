import easterEggs from '../../data/easter-eggs.json';
import masterPersonalities from '../../data/master-personalities.json';
import questions from '../../data/questions.json';
import subTags from '../../data/sub-tags.json';
import type {
  Dimensions,
  EasterEgg,
  MasterPersonality,
  MbaiEvaluationResult,
  Option,
  Question,
  SubTag,
} from '../types';

const masters = masterPersonalities as MasterPersonality[];
const tags = subTags as SubTag[];
const eggs = easterEggs as EasterEgg[];
const allQuestions = questions as Question[];

export const questionBank = allQuestions;
export const masterBank = masters;
export const subTagBank = tags;
export const easterEggBank = eggs;

const DIM_KEYS: ReadonlyArray<keyof Dimensions> = [
  'control',
  'emotion',
  'dependency',
  'social',
  'entertainment',
  'immersion',
  'multiModel',
  'urgency',
  'expression',
] as const;

const SUB_TAG_CLAUSES: Readonly<Record<string, string>> = {
  SPAM: '需求还没说完就想催稿',
  FAKE: '嘴上请帮忙，实际每个字都在催交付',
  TROLL: 'AI 说一句你总想顺手挑刺',
  CHECK: '同一问题必须反复验明正身',
  SHOW: '聊完第一反应就是截图发出去',
  RAGE: '情绪一上来连标点都开始打人',
  CITE: 'AI 刚开口就追问链接、出处和 DOI',
  LAZY: '上下文能少给一个字就少给一个字',
  RITUAL: '遇事先让 AI 给生活编一套象征解释',
  CHAIN: '一个点子不滚成系列就浑身难受',
  NOCONTEXT: '问题抛得像谜语，指望 AI 自己补全世界',
  STICKY: '不是不换，是旧模型已经被你盘出包浆了',
  PATIENT: '别人在催 AI，你在等它慢慢想',
};

// --- C01: DimensionBounds ---

export type DimensionBounds = Record<keyof Dimensions, { min: number; max: number }>;

export function getDimensionBounds(questionList: Question[]): DimensionBounds {
  const bounds = {} as DimensionBounds;
  DIM_KEYS.forEach((key) => {
    bounds[key] = questionList.reduce(
      (acc, question) => {
        const values = question.options.map((o) => o.dimensions[key] ?? 0);
        return {
          min: acc.min + Math.min(...values),
          max: acc.max + Math.max(...values),
        };
      },
      { min: 0, max: 0 },
    );
  });
  return bounds;
}

export const dimensionBounds: DimensionBounds = getDimensionBounds(allQuestions);

export function normalizeDimension(
  raw: number,
  key: keyof Dimensions,
  bounds: DimensionBounds,
): number {
  const { min, max } = bounds[key];
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (raw - min) / (max - min)));
}

// --- Helpers ---

export function createEmptyDimensions(): Dimensions {
  return {
    control: 0,
    emotion: 0,
    dependency: 0,
    social: 0,
    entertainment: 0,
    immersion: 0,
    multiModel: 0,
    urgency: 0,
    expression: 0,
  };
}

function getOption(question: Question, optionIndex: number): Option {
  return question.options[optionIndex];
}

// --- C02: collectAllTags ---

function collectAllTags(answerIndexes: number[]): string[] {
  const result: string[] = [];
  answerIndexes.forEach((optionIndex, questionIndex) => {
    const option = getOption(allQuestions[questionIndex], optionIndex);
    option.tags.forEach((tag) => result.push(tag));
  });
  return result;
}

// --- C03: traitVector similarity ---

function calculateTraitSimilarity(
  userDimensions: Dimensions,
  traitVector: Partial<Record<keyof Dimensions, number>>,
  bounds: DimensionBounds,
): number {
  let similarity = 0;
  let count = 0;
  for (const [key, target] of Object.entries(traitVector)) {
    const dimKey = key as keyof Dimensions;
    const normalized = normalizeDimension(userDimensions[dimKey], dimKey, bounds);
    similarity += 1 - Math.abs(normalized - target);
    count += 1;
  }
  return count > 0 ? similarity / count : 0;
}

// --- Core evaluation ---

export function calculateMaster(answerIndexes: number[]) {
  const dimensions = createEmptyDimensions();
  const masterScores: Record<string, number> = Object.fromEntries(
    masters.map((master) => [master.code, 0]),
  );

  answerIndexes.forEach((optionIndex, questionIndex) => {
    const option = getOption(allQuestions[questionIndex], optionIndex);

    DIM_KEYS.forEach((key) => {
      dimensions[key] += option.dimensions[key];
    });

    Object.entries(option.masterWeights).forEach(([code, weight]) => {
      masterScores[code] += weight;
    });
  });

  const userPoint: [number, number] = [
    normalizeDimension(dimensions.control, 'control', dimensionBounds),
    normalizeDimension(dimensions.emotion, 'emotion', dimensionBounds),
  ];

  let bestMaster = masters[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  masters.forEach((master) => {
    const [mx, my] = master.dimension;
    const distance = Math.sqrt((userPoint[0] - mx) ** 2 + (userPoint[1] - my) ** 2);
    const traitSimilarity = calculateTraitSimilarity(
      dimensions,
      master.traitVector,
      dimensionBounds,
    );
    const totalScore = masterScores[master.code] * 1.0
      + traitSimilarity * 4.0
      - distance * 2.0;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMaster = master;
    }
  });

  return { master: bestMaster, dimensions, userPoint };
}

export function calculateSubTags(answerIndexes: number[]): SubTag[] {
  const tagWeights = Object.fromEntries(tags.map((tag) => [tag.code, tag.weight]));
  const tagScores: Record<string, number> = Object.fromEntries(tags.map((tag) => [tag.code, 0]));

  answerIndexes.forEach((optionIndex, questionIndex) => {
    const option = getOption(allQuestions[questionIndex], optionIndex);
    option.tags.forEach((tagCode) => {
      tagScores[tagCode] += tagWeights[tagCode] ?? 1;
    });
  });

  return Object.entries(tagScores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score >= 2)
    .slice(0, 2)
    .map(([code]) => tags.find((tag) => tag.code === code))
    .filter((tag): tag is SubTag => Boolean(tag));
}

export function buildSubTagDescription(selectedTags: SubTag[]): string {
  if (selectedTags.length === 0) {
    return '你这次嘴脸控制得还算克制，暂时没叠满明显恶习。';
  }

  if (selectedTags.length === 1) {
    return `你这次最明显的毛病是${selectedTags[0].name}：${SUB_TAG_CLAUSES[selectedTags[0].code] ?? selectedTags[0].description}`;
  }

  const [first, second] = selectedTags;
  return `副标签叠加：${first.name} × ${second.name}。你属于那种${SUB_TAG_CLAUSES[first.code] ?? first.description}，而且${SUB_TAG_CLAUSES[second.code] ?? second.description}的人。`;
}

export function getPrompt(master: MasterPersonality, mode: 'light' | 'vibe' | 'efficiency'): string {
  if (mode === 'vibe') return master.promptVibe;
  if (mode === 'efficiency') return master.promptEfficiency;
  return master.promptLight;
}

export function getRelation(master: MasterPersonality, type: 'enemy' | 'partner'): MasterPersonality {
  const code = type === 'enemy' ? master.enemy : master.partner;
  const result = masters.find((item) => item.code === code);
  if (!result) {
    throw new Error(`Missing ${type} relation for ${master.code}`);
  }
  return result;
}

export function buildRelationLine(master: MasterPersonality, type: 'enemy' | 'partner'): string {
  if (type === 'enemy') {
    return master.enemyLine;
  }
  return master.partnerLine;
}

// --- C02: Deterministic easter egg ---

export function calculateEasterEgg(
  answerIndexes: number[],
  dimensions: Dimensions,
  masterCode: string,
): EasterEgg | undefined {
  const allTags = collectAllTags(answerIndexes);

  // MARTYR: PATIENT >= 4 and no RAGE
  const patientCount = allTags.filter((t) => t === 'PATIENT').length;
  const rageCount = allTags.filter((t) => t === 'RAGE').length;
  if (patientCount >= 4 && rageCount === 0) {
    return eggs.find((e) => e.code === 'MARTYR');
  }

  // CULT: high multiModel + high emotion + CHECK >= 4
  const normalizedMulti = normalizeDimension(dimensions.multiModel, 'multiModel', dimensionBounds);
  const normalizedEmotion = normalizeDimension(dimensions.emotion, 'emotion', dimensionBounds);
  const checkCount = allTags.filter((t) => t === 'CHECK').length;
  if (normalizedMulti >= 0.75 && normalizedEmotion >= 0.65 && checkCount >= 4) {
    return eggs.find((e) => e.code === 'CULT');
  }

  // TURING: JURY master + TROLL >= 3 + CHECK >= 4
  const trollCount = allTags.filter((t) => t === 'TROLL').length;
  if (masterCode === 'JURY' && trollCount >= 3 && checkCount >= 4) {
    return eggs.find((e) => e.code === 'TURING');
  }

  return undefined;
}

export function evaluateMbaiResult(answerIndexes: number[]): MbaiEvaluationResult {
  const { master, dimensions, userPoint } = calculateMaster(answerIndexes);
  const subTagsResult = calculateSubTags(answerIndexes);
  const easterEgg = calculateEasterEgg(answerIndexes, dimensions, master.code);

  return {
    master,
    subTags: subTagsResult,
    easterEgg,
    dimensions,
    userPoint,
  };
}
