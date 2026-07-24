import { NextResponse } from "next/server";
import { runSponsorCycle } from "@/lib/sandbox/runSponsorCycle";
import type {
  SandboxProductInput,
  SponsorConfiguration,
} from "@/lib/sandbox/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function configuration(): SponsorConfiguration {
  const daytona = Boolean(process.env.DAYTONA_API_KEY?.trim());
  const fireworks = Boolean(process.env.FIREWORKS_API_KEY?.trim());
  const braintrust = Boolean(process.env.BRAINTRUST_API_KEY?.trim());
  return { daytona, fireworks, braintrust, ready: daytona && fireworks && braintrust };
}

export async function GET() {
  return NextResponse.json(configuration());
}

export async function POST(request: Request) {
  const config = configuration();
  if (!config.ready) {
    return NextResponse.json(
      {
        error:
          "The live sandbox needs DAYTONA_API_KEY, FIREWORKS_API_KEY, and BRAINTRUST_API_KEY on the server.",
        configuration: config,
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const objective =
    body !== null && typeof body === "object" && "objective" in body
      ? (body as { objective?: unknown }).objective
      : undefined;
  const product =
    body !== null && typeof body === "object" && "product" in body
      ? (body as { product?: unknown }).product
      : undefined;

  if (product === null || typeof product !== "object") {
    return NextResponse.json(
      { error: "Product details are required." },
      { status: 400 },
    );
  }

  const productValue = product as Record<string, unknown>;
  const productFields = [
    "name",
    "landingUrl",
    "valueProp",
    "targetCustomer",
    "pricing",
    "painPoint",
  ] as const;

  for (const field of productFields) {
    if (
      typeof productValue[field] !== "string" ||
      productValue[field].trim().length === 0
    ) {
      return NextResponse.json(
        { error: `Product ${field} is required.` },
        { status: 400 },
      );
    }
    if (productValue[field].length > 300) {
      return NextResponse.json(
        { error: `Product ${field} must be 300 characters or fewer.` },
        { status: 400 },
      );
    }
  }

  const landingUrl = productValue.landingUrl as string;
  try {
    const parsedUrl = new URL(landingUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
  } catch {
    return NextResponse.json(
      { error: "Product landingUrl must be a valid HTTP or HTTPS URL." },
      { status: 400 },
    );
  }

  const normalizedProduct = Object.fromEntries(
    productFields.map((field) => [field, (productValue[field] as string).trim()]),
  ) as unknown as SandboxProductInput;

  if (typeof objective !== "string" || objective.trim().length < 12) {
    return NextResponse.json(
      { error: "Objective must contain at least 12 characters." },
      { status: 400 },
    );
  }
  if (objective.length > 500) {
    return NextResponse.json(
      { error: "Objective must be 500 characters or fewer." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await runSponsorCycle(objective.trim(), normalizedProduct),
    );
  } catch (error) {
    console.error("Sponsor sandbox run failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The sponsor sandbox workflow failed.",
      },
      { status: 502 },
    );
  }
}
