import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateFlowFromText,
  refineFlowFromInstruction,
} from "@/lib/ai/generate-flow";
import { flowSchemaDocumentSchema } from "@/lib/flow/schema";

const requestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("generate"),
    processText: z.string().trim().min(1),
  }),
  z.object({
    mode: z.literal("refine"),
    processText: z.string().trim().default(""),
    instruction: z.string().trim().min(1),
    currentDocument: flowSchemaDocumentSchema,
  }),
]);

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const result =
      body.mode === "generate"
        ? await generateFlowFromText(body.processText)
        : await refineFlowFromInstruction(
            body.processText,
            body.currentDocument,
            body.instruction,
          );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Envie dados validos para gerar ou refinar o fluxograma.",
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
