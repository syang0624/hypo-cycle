import { initLogger } from "braintrust";

export function register() {
  if (
    process.env.BRAINTRUST_API_KEY &&
    (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge")
  ) {
    initLogger({
      projectName: process.env.BRAINTRUST_PROJECT_NAME || "HypoCycle Demo",
    });
  }
}
