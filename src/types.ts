export interface Dimensions {
  control: number;
  emotion: number;
  dependency: number;
  social: number;
  entertainment: number;
  immersion: number;
  multiModel: number;
  urgency: number;
  expression: number;
}

export interface MasterPersonality {
  code: string;
  title: string;
  slug: string;
  dimension: [number, number];
  verdict: string;
  crime: string;
  scene: string;
  pardon: string;
  compliment: string;
  enemy: string;
  partner: string;
  promptLight: string;
  promptVibe: string;
  promptEfficiency: string;
}

export interface SubTag {
  code: string;
  name: string;
  description: string;
  weight: number;
}

export interface EasterEgg {
  code: string;
  title: string;
  condition: string;
  rate: number;
}

export interface Option {
  id: string;
  text: string;
  dimensions: Dimensions;
  tags: string[];
  masterWeights: Record<string, number>;
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
}

export interface MbaiEvaluationResult {
  master: MasterPersonality;
  subTags: SubTag[];
  easterEgg?: EasterEgg;
  dimensions: Dimensions;
  userPoint: [number, number];
}

export type PromptMode = 'light' | 'vibe' | 'efficiency';
