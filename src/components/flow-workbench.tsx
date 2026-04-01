"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { sampleFlowDocumentJson } from "@/lib/flow/example";
import { FlowDocumentParseError } from "@/lib/flow/parser";
import { resolveNormalizedFlowDocumentFromJson } from "@/lib/flow/resolve";
import type { NormalizedFlowDocument } from "@/lib/flow/types";
import { FlowPreview } from "./flow-preview";

type ValidationState = {
  status: "valid" | "invalid";
  message: string;
  issues: string[];
  nodeCount: number;
  edgeCount: number;
};

function buildInitialDocument() {
  return resolveNormalizedFlowDocumentFromJson(sampleFlowDocumentJson);
}

const initialDocument = buildInitialDocument();

export function FlowWorkbench() {
  const [source, setSource] = useState(sampleFlowDocumentJson);
  const [document, setDocument] =
    useState<NormalizedFlowDocument>(initialDocument);
  const lastValidCountsRef = useRef({
    nodeCount: initialDocument.nodes.length,
    edgeCount: initialDocument.edges.length,
  });
  const [validation, setValidation] = useState<ValidationState>(() => ({
    status: "valid",
    message: "JSON valido e pronto para renderizar.",
    issues: [],
    nodeCount: initialDocument.nodes.length,
    edgeCount: initialDocument.edges.length,
  }));
  const deferredSource = useDeferredValue(source);

  useEffect(() => {
    startTransition(() => {
      try {
        const nextDocument = resolveNormalizedFlowDocumentFromJson(deferredSource);
        const nextCounts = {
          nodeCount: nextDocument.nodes.length,
          edgeCount: nextDocument.edges.length,
        };

        setDocument(nextDocument);
        lastValidCountsRef.current = nextCounts;
        setValidation({
          status: "valid",
          message: "JSON valido e pronto para renderizar.",
          issues: [],
          ...nextCounts,
        });
      } catch (error) {
        const fallbackMessage =
          "Nao foi possivel transformar este JSON em fluxograma.";

        if (error instanceof FlowDocumentParseError) {
          setValidation({
            status: "invalid",
            message: error.message,
            issues: error.issues,
            ...lastValidCountsRef.current,
          });
          return;
        }

        setValidation({
          status: "invalid",
          message: fallbackMessage,
          issues: [fallbackMessage],
          ...lastValidCountsRef.current,
        });
      }
    });
  }, [deferredSource]);

  return (
    <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
      <aside className="space-y-4 xl:sticky xl:top-8">
        <article className="rounded-[2rem] border border-line bg-surface p-5 shadow-[var(--shadow)]">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted">
            Fonte
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            JSON dirigido por schema
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            O diagrama agora nasce do JSON do projeto. O preview usa parse,
            validacao e normalizacao antes de chegar no React Flow.
          </p>
        </article>

        <article className="rounded-[2rem] border border-line bg-surface p-5 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted">
                Estado
              </p>
              <p className="mt-3 text-base font-semibold">
                {validation.status === "valid"
                  ? "Estrutura valida"
                  : "Aguardando correcao"}
              </p>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                validation.status === "valid"
                  ? "bg-[#e4f5ef] text-[#1f7a63]"
                  : "bg-[#fbe7dc] text-[#b4552a]"
              }`}
            >
              {validation.status === "valid" ? "OK" : "Erro"}
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-muted">{validation.message}</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[1.25rem] border border-line bg-white/70 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted">
                Nodes
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {validation.nodeCount}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-line bg-white/70 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted">
                Edges
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {validation.edgeCount}
              </p>
            </div>
          </div>

          {validation.issues.length > 0 ? (
            <div className="mt-5 rounded-[1.5rem] border border-[rgba(201,111,59,0.2)] bg-[#fff6ef] p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#b4552a]">
                Issues
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6e4630]">
                {validation.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>

        <article className="rounded-[2rem] border border-line bg-[#1f1c18] p-5 text-white shadow-[var(--shadow)]">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-white/60">
            Formato esperado
          </p>
          <p className="mt-4 text-sm leading-6 text-white/78">
            Cada node precisa de `id`, `type` e `label`. Cada edge precisa de
            `source`, `target` e pode ter `label`.
          </p>
        </article>
      </aside>

      <section className="grid gap-6">
        <article className="rounded-[2.25rem] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted">
                Entrada JSON
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Edite a estrutura abaixo e veja o fluxograma reagir mantendo a
                ultima versao valida no canvas.
              </p>
            </div>
          </div>

          <textarea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            spellCheck={false}
            className="min-h-[340px] w-full resize-y rounded-[1.75rem] border border-line bg-[#201d1a] p-5 font-mono text-[13px] leading-6 text-[#f6efe2] outline-none transition focus:border-accent focus:ring-4 focus:ring-[rgba(201,111,59,0.16)]"
          />
        </article>

        <section className="relative">
          <div className="absolute left-8 top-10 h-32 w-32 rounded-full bg-accent/15 blur-3xl" />
          <div className="absolute bottom-10 right-12 h-40 w-40 rounded-full bg-accent-strong/15 blur-3xl" />

          <div className="relative rounded-[2.25rem] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
            <FlowPreview document={document} />
          </div>
        </section>
      </section>
    </div>
  );
}
