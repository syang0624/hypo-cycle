export const DEMO_PROGRAM_STORAGE_KEY = "hypocycle:demo-program";

export type DemoProgram = {
  name: string;
  landingUrl: string;
  valueProp: string;
  targetCustomer: string;
  pricing: string;
  painPoint: string;
  dailyBudget: number;
  totalBudget: number;
  maxCPC: number;
  targetCAC: number;
  goal: "maximize_trials" | "minimize_cac" | "maximize_clicks";
};

export const SAMPLE_PROGRAM: DemoProgram = {
  name: "Coca-Cola",
  landingUrl: "https://www.coca-cola.com/",
  valueProp: "The original, refreshing cola for moments worth sharing.",
  targetCustomer: "Gen Z consumers looking for an affordable everyday treat",
  pricing: "$1.99 single-serve bottle",
  painPoint: "Premium wellness drinks are expensive and often disappointing.",
  dailyBudget: 2500,
  totalBudget: 21000,
  maxCPC: 1.5,
  targetCAC: 4.5,
  goal: "minimize_cac",
};
