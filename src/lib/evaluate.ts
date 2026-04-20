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

const DIM_KEYS: Array<keyof Dimensions> = [
  'control',
  'emotion',
  'dependency',
  'social',
  'entertainment',
  'immersion',
  'multiModel',
  'urgency',
  'expression',
];

const SUB_TAG_CLAUSES: Record<string, string> = {
  SPAM: '需求还没说完就想催稿',
  FAKE: '嘴上很客气，手上照样在赶进度',
  TROLL: 'AI 说一句你总想顺手挑刺',
  CHECK: '同一问题必须反复验明正身',
  SHOW: '聊完第一反应就是截图发出去',
  RAGE: '情绪一上来连标点都开始打人',
  CITE: '一句话没听完先追着它要出处',
  LAZY: '上下文能少给一个字就少给一个字',
};

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

export function normalizeDimension(raw: number): number {
  return Math.max(0, Math.min(1, (raw + 40) / 80));
}

function createSeed(answerIndexes: number[]): number {
  return answerIndexes.reduce((acc, value, index) => {
    return (acc * 131 + (value + 1) * (index + 17)) >>> 0;
  }, 7);
}

function seededRandom(seed: number): number {
  const next = (seed * 1664525 + 1013904223) >>> 0;
  return next / 4294967296;
}

function getOption(question: Question, optionIndex: number): Option {
  return question.options[optionIndex];
}

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
    normalizeDimension(dimensions.control),
    normalizeDimension(dimensions.emotion),
  ];

  let bestMaster = masters[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  masters.forEach((master) => {
    const [mx, my] = master.dimension;
    const distance = Math.sqrt((userPoint[0] - mx) ** 2 + (userPoint[1] - my) ** 2);
    const totalScore = masterScores[master.code] - distance * 5;

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
  const relation = getRelation(master, type);
  if (type === 'enemy') {
    return `你最烦的，通常就是${relation.slug}这一套做派。`;
  }
  return `${relation.slug}最容易和你形成互补，凑一起不是更疯就是更强。`;
}

export function calculateEasterEgg(
  answerIndexes: number[],
  dimensions: Dimensions,
  masterCode: string,
): EasterEgg | undefined {
  const seed = createSeed(answerIndexes);
  const random = seededRandom(seed);
  const normalizedMulti = normalizeDimension(dimensions.multiModel);
  const normalizedEmotion = normalizeDimension(dimensions.emotion);

  const patientCount = answerIndexes.reduce((count, optionIndex, questionIndex) => {
    const urgency = getOption(allQuestions[questionIndex], optionIndex).dimensions.urgency;
    return urgency < 0 ? count + 1 : count;
  }, 0);

  if (patientCount >= 5 && random < 0.3) {
    return eggs.find((egg) => egg.code === 'MARTYR');
  }

  if (normalizedMulti > 0.8 && normalizedEmotion > 0.8 && random < 0.25) {
    return eggs.find((egg) => egg.code === 'CULT');
  }

  const trollCheck = answerIndexes.reduce((count, optionIndex, questionIndex) => {
    const currentTags = getOption(allQuestions[questionIndex], optionIndex).tags;
    return currentTags.includes('TROLL') || currentTags.includes('CHECK') ? count + 1 : count;
  }, 0);

  if (masterCode === 'JURY' && trollCheck >= 7 && random < 0.4) {
    return eggs.find((egg) => egg.code === 'TURING');
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
