import type { PublicQuestion } from "@/lib/questions";
import type { Part } from "@/lib/grading";

export type { PublicQuestion };
export type Feedback = {
  isCorrect: boolean | null;
  points: number | null;
  maxPoints: number;
  parts: Part[];
  expected: string;
  explanation: string;
  method: string;
  encouragement: string;
  xpGained: number;
  newBadges: { name: string; icon: string }[];
  correction?: { targets?: { label: string; x: number; y: number }[]; modelAnswer?: string; criteria?: { label: string; points: number }[]; mcqCorrect?: number[] };
};
