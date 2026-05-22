// FSRS 4.5 weights — Ye et al. 2022, SIGKDD. Do not modify without citing the spec.
export const FSRS_WEIGHTS = [
  0.4072, 1.1829, 3.1262, 15.4722, // w[0-3]  initial stability by rating (again/hard/good/easy)
  7.2102, 0.5316, 1.0651, 0.0589,  // w[4-7]  difficulty params
  1.5330, 0.1544, 1.0042, 1.9395,  // w[8-11] stability increase + lapse
  0.1100, 0.2900, 2.2700, 0.1600,  // w[12-15] hard modifier context
  2.9898, 0.5100, 0.4338,          // w[16-18] easy modifier + interval params
] as const;

export const DEFAULT_DESIRED_RETENTION = 0.9;
