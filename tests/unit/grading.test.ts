import { describe, expect, it } from "vitest";
import { grade, scoreSummary, textMatches, normalize, responseText } from "@/lib/grading";

describe("textMatches", () => {
  it("ignore accents, majuscules et articles", () => {
    expect(textMatches("  l'Église ", ["eglise"])).toBe(true);
    expect(textMatches("LE BASILEUS", ["basileus"])).toBe(true);
    expect(textMatches("Constantinople", ["constantinople"])).toBe(true);
  });
  it("tolère une faute de frappe sur un mot long seulement", () => {
    expect(textMatches("Constantinopel", ["Constantinople"])).toBe(false); // deux lettres permutées = 2 opérations
    expect(textMatches("Constantinope", ["Constantinople"])).toBe(true);
    expect(textMatches("pap", ["pape"])).toBe(false);
  });
  it("refuse une réponse vide", () => {
    expect(textMatches("", ["pape"])).toBe(false);
    expect(normalize(null)).toBe("");
  });
});

describe("grade", () => {
  it("QCM : bonne réponse unique et multiple, ordre indifférent", () => {
    const d = { options: ["a", "b", "c"], correct: [2, 0] };
    expect(grade("MCQ", d, { selected: [0, 2] }, 2).points).toBe(2);
    expect(grade("MCQ", d, { selected: [0] }, 2).points).toBe(0);
    expect(grade("MCQ", d, { selected: [0, 1, 2] }, 2).isCorrect).toBe(false);
    expect(grade("MCQ", d, {}, 2).points).toBe(0);
  });
  it("vrai/faux exige un booléen", () => {
    expect(grade("TRUE_FALSE", { correct: false }, { value: false }, 1).points).toBe(1);
    expect(grade("TRUE_FALSE", { correct: false }, { value: "false" }, 1).points).toBe(0);
  });
  it("texte à trous : un pluriel oublié sur un mot long est toléré", () => {
    expect(textMatches("orthodoxe", ["orthodoxes"])).toBe(true);
  });
  it("texte à trous : crédit partiel arrondi au quart de point", () => {
    const d = { text: "En [[1054]], le [[schisme]] sépare les [[orthodoxes]] et les [[catholiques|catholique]].", wordBank: false };
    const r = grade("FILL_BLANK", d, { blanks: ["1054", "Schisme", "catholiques", "catholique"] }, 3);
    expect(r.parts.map((p) => p.ok)).toEqual([true, true, false, true]);
    expect(r.points).toBe(2.25);
    expect(r.isCorrect).toBe(false);
  });
  it("association, catégories, ordre, frise", () => {
    expect(grade("MATCH", { pairs: [{ left: "A", right: "1" }, { left: "B", right: "2" }] }, { pairs: { A: "1", B: "1" } }, 4).points).toBe(2);
    expect(grade("CATEGORIZE", { categories: ["X", "Y"], items: [{ text: "a", category: "X" }, { text: "b", category: "Y" }] }, { assign: { a: "X", b: "Y" } }, 1).isCorrect).toBe(true);
    expect(grade("ORDER", { items: ["1", "2", "3", "4"] }, { order: ["1", "2", "4", "3"] }, 4).points).toBe(2);
    const tl = { min: 700, max: 1500, tolerance: 10, events: [{ label: "Sacre", year: 800 }, { label: "Schisme", year: 1054 }] };
    expect(grade("TIMELINE", tl, { years: { Sacre: 805, Schisme: "1030" } }, 2).points).toBe(1);
  });
  it("calcul numérique avec tolérance et virgule française", () => {
    expect(grade("NUMERIC", { answer: 3.5, tolerance: 0, unit: "cm" }, { value: "3,5" }, 1).points).toBe(1);
    expect(grade("NUMERIC", { answer: 3.5, tolerance: 0.1 }, { value: "3.58" }, 1).points).toBe(1);
    expect(grade("NUMERIC", { answer: 3.5 }, { value: "abc" }, 1).points).toBe(0);
  });
  it("placement sur carte : rayon de tolérance", () => {
    const d = { image: "x.svg", targets: [{ label: "Rome", x: 42, y: 62, r: 4 }] };
    expect(grade("IMAGE_POINT", d, { points: { Rome: { x: 44, y: 63 } } }, 1).points).toBe(1);
    expect(grade("IMAGE_POINT", d, { points: { Rome: { x: 50, y: 63 } } }, 1).points).toBe(0);
  });
  it("une réponse rédigée n'est JAMAIS notée automatiquement", () => {
    const r = grade("OPEN", { criteria: [{ label: "c", points: 4 }], modelAnswer: "m" }, { text: "Une réponse" }, 4);
    expect(r.autoGradable).toBe(false);
    expect(r.points).toBeNull();
  });
});

describe("scoreSummary", () => {
  it("pas de note /20 tant qu'une réponse attend sa correction", () => {
    const s = scoreSummary([{ pointsAwarded: 4, maxPoints: 4 }, { pointsAwarded: null, maxPoints: 4 }]);
    expect(s.complete).toBe(false);
    expect(s.scoreOn20).toBeNull();
    expect(s.pendingPoints).toBe(4);
  });
  it("note /20 proportionnelle, arrondie au quart", () => {
    const s = scoreSummary([{ pointsAwarded: 13, maxPoints: 16 }, { pointsAwarded: 2.5, maxPoints: 4 }]);
    expect(s.scoreOn20).toBe(15.5);
    expect(scoreSummary([{ pointsAwarded: 1, maxPoints: 3 }]).scoreOn20).toBe(6.75);
  });
  it("aucune note sur un contrôle vide", () => {
    expect(scoreSummary([]).scoreOn20).toBeNull();
  });
});

describe("responseText", () => {
  it("affiche la réponse de l'élève lisiblement", () => {
    expect(responseText("MCQ", { options: ["a", "b"] }, { selected: [1] })).toBe("b");
    expect(responseText("OPEN", {}, { text: "  " })).toBe("—");
  });
});
