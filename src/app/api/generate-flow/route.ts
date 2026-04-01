import { NextResponse } from "next/server";
import { z } from "zod";
import { generateFlowFromText } from "@/lib/ai/generate-flow";

const requestSchema = z.object({
  processText: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const result = await generateFlowFromText(body.processText);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Envie um texto valido para gerar o fluxograma.",
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: "Nao foi possivel gerar o fluxograma agora.",
      },
      { status: 500 },
    );
  }
}
