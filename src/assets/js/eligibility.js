// Phase-N target: a pure function `(salary, age, rules) => EligibilityResult` per
// architecture.md §6/§8 — no DOM access, trivially testable. The init() export below exists
// only for scaffolding-phase uniformity with the other modules; the real module will export
// the pure function instead (and may drop init() entirely once calculator.js calls it directly).
export function init() {}
