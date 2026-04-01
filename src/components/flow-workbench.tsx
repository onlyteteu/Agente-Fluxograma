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
import {
  simulateFlowDocumentFromText,
  stringifyFlowDocument,
} from "@/lib/flow/simulate";
import type { NormalizedFlowDocument } from "@/lib/flow/types";
import { FlowPreview } from "./flow-preview";

type ValidationState = {
  status: "valid" | "invalid";
  message: string;
  issues: string[];
  nodeCount: number;
  edgeCount: number;
};

const exampleProcessPrompt = `Quando um novo cliente chega, a equipe comercial registra o pedido, o financeiro valida pagamento, e o projeto so segue para onboarding se tudo estiver aprovado. Se faltar algum dado, o cliente recebe uma solicitacao de ajuste antes de continuar.`;

const promptSuggestions = [
  "Comece pelo gatilho inicial do processo.",
  "Liste etapas importantes em ordem.",
  "Explique decisoes com se/entao.",
  "Inclua excecoes ou retornos quando existirem.",
];

function buildInitialDocument() {
  return resolveNormalizedFlowDocumentFromJson(sampleFlowDocumentJson);
}

const initialDocument = buildInitialDocument();

export function FlowWorkbench() {
  const [source, setSource] = useState(sampleFlowDocumentJson);
  const [processText, setProcessText] = useState(exampleProcessPrompt);
  const [generationMessage, setGenerationMessage] = useState(
    "Pronto para gerar uma estrutura simulada compativel com o schema.",
  );
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

  function handleGenerateFlow() {
    const simulatedDocument = simulateFlowDocumentFromText(processText);
    const nextSource = stringifyFlowDocument(simulatedDocument);

    startTransition(() => {
      setSource(nextSource);
      setGenerationMessage(
        "Estrutura simulada gerada a partir do texto e enviada para o canvas.",
      );
    });
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <article className="rounded-[2.5rem] border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
          <div className="flex flex-col gap-5 border-b border-line/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
                Entrada principal
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                Descreva o processo em linguagem natural
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
                Esta area prepara a experiencia conversacional do produto. O
                proximo passo sera conectar esse texto a uma chamada de IA que
                devolve o JSON do fluxograma.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setProcessText(exampleProcessPrompt)}
              className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent hover:bg-white"
            >
              Carregar exemplo guiado
            </button>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
            <div>
              <label
                htmlFor="process-text"
                className="font-mono text-xs uppercase tracking-[0.26em] text-muted"
              >
                Texto do processo
              </label>
              <textarea
                id="process-text"
                value={processText}
                onChange={(event) => setProcessText(event.target.value)}
                placeholder="Exemplo: quando um pedido chega, o time confere estoque, aprova pagamento e decide se o envio pode seguir..."
                className="mt-3 min-h-[260px] w-full resize-y rounded-[2rem] border border-line bg-[#fffdf8] p-5 text-[15px] leading-7 text-foreground outline-none transition placeholder:text-[#8b8175] focus:border-accent focus:ring-4 focus:ring-[rgba(201,111,59,0.16)]"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleGenerateFlow}
                  disabled={processText.trim().length === 0}
                  className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:bg-[#2f2a24] disabled:cursor-not-allowed disabled:bg-[#7f766c]"
                >
                  Gerar estrutura simulada
                </button>
                {promptSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() =>
                      setProcessText((current) =>
                        current.trim().length === 0
                          ? suggestion
                          : `${current.trim()} ${suggestion}`,
                      )
                    }
                    className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-dashed border-line bg-white/60 p-4 text-sm leading-6 text-muted">
                {generationMessage}
              </div>
            </div>

            <div className="space-y-4">
              <article className="rounded-[1.75rem] border border-line bg-[#1f1c18] p-5 text-white">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-white/60">
                  Futuro payload
                </p>
                <p className="mt-3 text-sm leading-6 text-white/78">
                  A IA vai receber este texto, instrucoes de estilo e a regra de
                  saida no schema de nodes e edges.
                </p>
                <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/6 p-4 font-mono text-[12px] leading-6 text-white/82">
                  <div>{`input: "${processText.slice(0, 84)}${processText.length > 84 ? "..." : ""}"`}</div>
                  <div>output: flow-schema (simulado)</div>
                  <div>mode: temporary-local-generator</div>
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-line bg-surface-strong p-5">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
                  Preparacao
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[1.25rem] border border-line bg-white/80 p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                      Caracteres
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {processText.trim().length}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-line bg-white/80 p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                      Linhas
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {processText
                        .split("\n")
                        .filter((line) => line.trim().length > 0).length || 1}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-[1.25rem] border border-dashed border-line bg-white/40 p-4 text-sm leading-6 text-muted">
                  Este botao agora gera uma estrutura temporaria local. Na
                  proxima fase, ele pode trocar o simulador por uma chamada real
                  de IA sem mudar a interface principal.
                </div>
              </article>
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[2rem] border border-line bg-surface p-5 shadow-[var(--shadow)]">
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted">
              Guia rapido
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight">
              O que escrever aqui
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <li>Qual evento inicia o processo.</li>
              <li>Quais etapas acontecem em sequencia.</li>
              <li>Quais decisoes abrem caminhos diferentes.</li>
              <li>Que situacoes fazem o fluxo voltar ou encerrar.</li>
            </ul>
          </article>

          <article className="rounded-[2rem] border border-line bg-surface p-5 shadow-[var(--shadow)]">
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted">
              Direcao
            </p>
            <p className="mt-4 text-sm leading-6 text-muted">
              A entrada em texto e a camada de produto. O editor JSON continua
              logo abaixo como camada tecnica e de depuracao.
            </p>
          </article>
        </aside>
      </section>

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

            <p className="mt-4 text-sm leading-6 text-muted">
              {validation.message}
            </p>

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
                  Esta camada tecnica continua disponivel para validar schema,
                  inspecionar o JSON gerado e depurar a futura resposta da IA.
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
    </div>
  );
}
