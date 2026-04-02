"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  buildPdfExportPayload,
  exportFlowPreviewAsImage,
  FLOW_PREVIEW_EXPORT_ID,
} from "@/lib/export/flow-export";
import { FlowDocumentParseError } from "@/lib/flow/parser";
import { stringifyFlowDocument } from "@/lib/flow/simulate";
import {
  createInitialWorkbenchDocument,
  resolveWorkbenchDocumentFromJson,
} from "@/lib/flow/workbench-document";
import {
  requestFlowGeneration,
  requestFlowRefinement,
} from "@/lib/flow/generate-client";
import {
  clearPersistedWorkbenchState,
  loadPersistedWorkbenchState,
  savePersistedWorkbenchState,
} from "@/lib/persistence/workbench-storage";
import { getFlowLayoutMetrics } from "@/lib/flow/layout";
import type {
  FlowSchemaDocument,
  NormalizedFlowDocument,
} from "@/lib/flow/types";
import { FlowPreview } from "./flow-preview";

type ValidationState = {
  status: "valid" | "invalid";
  message: string;
  issues: string[];
  nodeCount: number;
  edgeCount: number;
};

type GenerationState = {
  status: "idle" | "loading" | "success" | "error";
  title: string;
  detail: string;
  source?: "ai" | "simulator";
};

type ExportState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

const exampleProcessPrompt = `Quando um novo cliente chega, a equipe comercial registra o pedido, o financeiro valida pagamento, e o projeto so segue para onboarding se tudo estiver aprovado. Se faltar algum dado, o cliente recebe uma solicitacao de ajuste antes de continuar.`;
const exampleRefinementPrompt =
  "Adicione uma etapa de validacao documental antes de iniciar o onboarding.";

const promptSuggestions = [
  "Comece pelo gatilho inicial do processo.",
  "Liste etapas importantes em ordem.",
  "Explique decisoes com se/entao.",
  "Inclua excecoes ou retornos quando existirem.",
];

const refinementSuggestions = [
  "Adicione aprovacao do gerente antes de validar o pagamento.",
  "Troque o cancelamento final por uma solicitacao de ajuste.",
  "Inclua uma validacao documental antes de iniciar o onboarding.",
  "Mantenha o fluxo atual, mas adicione revisao comercial antes da confirmacao.",
];

const initialWorkbenchDocument = createInitialWorkbenchDocument();
const initialSchemaDocument = initialWorkbenchDocument.schemaDocument;
const initialDocument = initialWorkbenchDocument.document;
const initialSource = initialWorkbenchDocument.source;
const initialCounts = initialWorkbenchDocument.counts;

function buildValidationState(
  counts: { nodeCount: number; edgeCount: number },
): ValidationState {
  return {
    status: "valid",
    message: "JSON valido e pronto para renderizar.",
    issues: [],
    ...counts,
  };
}

function getToneByStatus(status: GenerationState["status"] | ExportState["status"]) {
  if (status === "success") {
    return "border-[rgba(31,122,99,0.18)] bg-[rgba(239,250,245,0.9)] text-[#1d5f4f]";
  }

  if (status === "error") {
    return "border-[rgba(201,111,59,0.2)] bg-[#fff6ef] text-[#8f4a22]";
  }

  if (status === "loading") {
    return "border-[rgba(34,56,84,0.12)] bg-[rgba(244,247,251,0.92)] text-[#31465d]";
  }

  return "border-line bg-white/60 text-muted";
}

function getGenerationEyebrow(status: GenerationState["status"]) {
  if (status === "loading") {
    return "Processando";
  }

  if (status === "success") {
    return "Sucesso";
  }

  if (status === "error") {
    return "Geracao";
  }

  return "Estado";
}

type FlowWorkbenchProps = {
  isPresentationMode?: boolean;
};

export function FlowWorkbench({
  isPresentationMode = false,
}: FlowWorkbenchProps) {
  const [source, setSource] = useState(initialSource);
  const [processText, setProcessText] = useState(exampleProcessPrompt);
  const [refinementText, setRefinementText] = useState(exampleRefinementPrompt);
  const [isTechnicalVisible, setIsTechnicalVisible] = useState(false);
  const [isSupportVisible, setIsSupportVisible] = useState(false);
  const [isMorePromptSuggestionsVisible, setIsMorePromptSuggestionsVisible] =
    useState(false);
  const [
    isMoreRefinementSuggestionsVisible,
    setIsMoreRefinementSuggestionsVisible,
  ] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewMounted, setIsPreviewMounted] = useState(false);
  const [isPreviewCelebrating, setIsPreviewCelebrating] = useState(false);
  const [generationState, setGenerationState] = useState<GenerationState>({
    status: "idle",
    title: "Pronto para gerar",
    detail: "Descreva o processo e envie o texto para montar o fluxograma.",
  });
  const [exportState, setExportState] = useState<ExportState>({
    status: "idle",
    message: "Exporte o preview como imagem quando quiser compartilhar o fluxo.",
  });
  const [document, setDocument] =
    useState<NormalizedFlowDocument>(initialDocument);
  const [schemaDocument, setSchemaDocument] =
    useState<FlowSchemaDocument>(initialSchemaDocument);
  const [hasGeneratedFlow, setHasGeneratedFlow] = useState(false);
  const [isPersistenceReady, setIsPersistenceReady] = useState(false);
  const lastValidCountsRef = useRef({
    ...initialCounts,
  });
  const [validation, setValidation] = useState<ValidationState>(() =>
    buildValidationState(initialCounts),
  );
  const deferredSource = useDeferredValue(source);
  const previewCanvasHeight =
    getFlowLayoutMetrics(document).canvasHeight + (isPresentationMode ? 110 : 0);

  useEffect(() => {
    setIsTechnicalVisible(false);
    setIsPreviewMounted(true);
  }, []);

  useEffect(() => {
    if (isPresentationMode) {
      setIsTechnicalVisible(false);
    }
  }, [isPresentationMode]);

  useEffect(() => {
    if (generationState.status !== "success") {
      return;
    }

    setIsPreviewCelebrating(true);

    const timeoutId = window.setTimeout(() => {
      setIsPreviewCelebrating(false);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [generationState.detail, generationState.status, generationState.title]);

  useEffect(() => {
    const persistedState = loadPersistedWorkbenchState();

    if (!persistedState) {
      setIsPersistenceReady(true);
      return;
    }

    setProcessText(persistedState.processText);
    setRefinementText(persistedState.refinementText);
    setSource(persistedState.source);
    setHasGeneratedFlow(persistedState.hasGeneratedFlow);
    setGenerationState({
      status: "idle",
      title: "Rascunho restaurado",
      detail: "O ultimo estado local foi restaurado automaticamente.",
    });
    setExportState({
      status: "idle",
      message: "O preview restaurado ja pode ser exportado como imagem.",
    });

    try {
      const restoredDocument = resolveWorkbenchDocumentFromJson(
        persistedState.lastValidSource,
      );

      setSchemaDocument(restoredDocument.schemaDocument);
      setDocument(restoredDocument.document);
      lastValidCountsRef.current = restoredDocument.counts;
      setValidation(buildValidationState(restoredDocument.counts));
    } catch {
      setSchemaDocument(initialSchemaDocument);
      setDocument(initialDocument);
    }

    setIsPersistenceReady(true);
  }, []);

  useEffect(() => {
    if (!isPersistenceReady) {
      return;
    }

    savePersistedWorkbenchState({
      processText,
      refinementText,
      source,
      lastValidSource: stringifyFlowDocument(schemaDocument),
      hasGeneratedFlow,
      savedAt: new Date().toISOString(),
    });
  }, [hasGeneratedFlow, isPersistenceReady, processText, refinementText, schemaDocument, source]);

  useEffect(() => {
    startTransition(() => {
      try {
        const nextResolvedDocument = resolveWorkbenchDocumentFromJson(deferredSource);

        setSchemaDocument(nextResolvedDocument.schemaDocument);
        setDocument(nextResolvedDocument.document);
        lastValidCountsRef.current = nextResolvedDocument.counts;
        setValidation(buildValidationState(nextResolvedDocument.counts));
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

  function handleLoadExample() {
    setProcessText(exampleProcessPrompt);
    setGenerationState({
      status: "idle",
      title: "Exemplo carregado",
      detail: "O texto de exemplo esta pronto para uma nova geracao.",
    });
  }

  function handleResetWorkbench() {
    startTransition(() => {
      setProcessText("");
      setRefinementText("");
      setSource(initialSource);
      setDocument(initialDocument);
      lastValidCountsRef.current = {
        ...initialCounts,
      };
      setValidation(buildValidationState(initialCounts));
      setSchemaDocument(initialSchemaDocument);
      setHasGeneratedFlow(false);
      setGenerationState({
        status: "idle",
        title: "Tela limpa",
        detail: "Escreva um novo processo para comecar outra geracao.",
      });
      setExportState({
        status: "idle",
        message: "A exportacao sera habilitada assim que houver um preview pronto.",
      });
      clearPersistedWorkbenchState();
    });
  }

  async function handleGenerateFlow() {
    setIsGenerating(true);
    setGenerationState({
      status: "loading",
      title: "Gerando fluxograma",
      detail:
        "Organizando etapas, decisoes e conexoes para montar um diagrama claro.",
    });

    try {
      const result = await requestFlowGeneration(processText);
      const nextSource = stringifyFlowDocument(result.document);

      startTransition(() => {
        setSource(nextSource);
        setHasGeneratedFlow(true);
        setGenerationState({
          status: "success",
          title:
            result.source === "ai"
              ? "Fluxograma atualizado"
              : "Fluxograma gerado em modo local",
          detail: result.message,
          source: result.source,
        });
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel gerar o fluxograma agora.";

      startTransition(() => {
        setGenerationState({
          status: "error",
          title: "Nao foi possivel gerar agora",
          detail: `${message} O ultimo resultado valido foi mantido no preview.`,
        });
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRefineFlow() {
    if (!hasGeneratedFlow || validation.status !== "valid") {
      setGenerationState({
        status: "error",
        title: "Gere um fluxo antes de refinar",
        detail:
          "O refinamento usa o diagrama atual como contexto. Gere uma primeira versao valida para depois evoluir a estrutura.",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationState({
      status: "loading",
      title: "Refinando fluxograma",
      detail:
        "Aplicando sua instrucao sobre a estrutura atual sem perder o ultimo resultado valido.",
    });

    try {
      const result = await requestFlowRefinement(
        processText,
        schemaDocument,
        refinementText,
      );
      const nextSource = stringifyFlowDocument(result.document);

      startTransition(() => {
        setSource(nextSource);
        setHasGeneratedFlow(true);
        setGenerationState({
          status: "success",
          title:
            result.source === "ai"
              ? "Fluxograma refinado"
              : "Refinamento aplicado em modo local",
          detail: result.message,
          source: result.source,
        });
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel refinar o fluxograma agora.";

      startTransition(() => {
        setGenerationState({
          status: "error",
          title: "Nao foi possivel refinar agora",
          detail: `${message} O ultimo resultado valido foi mantido no preview.`,
        });
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleExportImage() {
    if (!isPreviewMounted) {
      setExportState({
        status: "error",
        message: "Aguarde o preview terminar de carregar antes de exportar.",
      });
      return;
    }

    const exportRoot = window.document.getElementById(FLOW_PREVIEW_EXPORT_ID);

    if (!(exportRoot instanceof HTMLElement)) {
      setExportState({
        status: "error",
        message: "Nao encontrei o preview do fluxograma para exportar.",
      });
      return;
    }

    setExportState({
      status: "loading",
      message: "Preparando a imagem do fluxograma para download.",
    });

    try {
      const pdfPayload = buildPdfExportPayload(processText, schemaDocument);
      const result = await exportFlowPreviewAsImage(exportRoot, pdfPayload);

      setExportState({
        status: "success",
        message: `Imagem exportada como ${result.fileName}. A base para PDF ja ficou preparada nesta mesma camada.`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel exportar a imagem do fluxograma agora.";

      setExportState({
        status: "error",
        message,
      });
    }
  }

  const generationTone =
    getToneByStatus(generationState.status);
  const exportTone = getToneByStatus(exportState.status);
  const technicalToggleLabel = isTechnicalVisible
    ? "Ocultar estrutura tecnica"
    : "Ver estrutura tecnica";
  const canRefine =
    hasGeneratedFlow && validation.status === "valid" && !isGenerating;
  const refinementStatusTitle = hasGeneratedFlow
    ? "Fluxo atual pronto para evoluir"
    : "Gere um fluxo para liberar o refinamento";
  const refinementStatusDetail = hasGeneratedFlow
    ? "A proxima instrucao usa o diagrama atual como base e preserva a estrutura valida sempre que possivel."
    : "Primeiro gere um fluxo a partir do texto. Depois use instrucoes curtas para ajustar etapas, decisoes ou caminhos.";
  const visiblePromptChips = isMorePromptSuggestionsVisible
    ? promptSuggestions
    : promptSuggestions.slice(0, 2);
  const visibleRefinementChips = isMoreRefinementSuggestionsVisible
    ? refinementSuggestions
    : refinementSuggestions.slice(0, 2);
  const hasExtraPromptSuggestions =
    visiblePromptChips.length < promptSuggestions.length;
  const hasExtraRefinementSuggestions =
    visibleRefinementChips.length < refinementSuggestions.length;

  return (
    <div
      className={`grid gap-6 ${
        isPresentationMode
          ? "xl:grid-cols-[minmax(360px,0.74fr)_minmax(0,1.72fr)] xl:gap-6 2xl:grid-cols-[minmax(380px,0.7fr)_minmax(0,1.85fr)]"
          : "xl:grid-cols-[minmax(340px,0.72fr)_minmax(0,1.58fr)] xl:gap-7 2xl:grid-cols-[minmax(360px,0.7fr)_minmax(0,1.7fr)]"
      }`}
    >
      <section className="grid gap-4 xl:col-start-1 xl:row-start-1">
        <article
          className={`rounded-[2.2rem] border border-line p-5 shadow-[var(--shadow)] sm:p-5 xl:sticky xl:top-6 ${
            isPresentationMode
              ? "bg-[rgba(255,250,242,0.9)]"
              : "bg-surface"
          }`}
        >
          <div className="flex flex-col gap-4 border-b border-line/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
                {isPresentationMode ? "Modo apresentacao" : "Entrada principal"}
              </p>
              <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.04em]">
                {isPresentationMode
                  ? "Texto, refinamento e preview em primeiro plano"
                  : "Descreva o processo em linguagem natural"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted sm:text-[15px]">
                {isPresentationMode
                  ? "Os paineis tecnicos e os apoios secundarios saem do caminho para a demo ficar mais limpa, com foco na evolucao do fluxo e no resultado visual."
                  : "Descreva o processo, gere o fluxo e refine a estrutura com instrucoes curtas quando quiser evoluir o resultado."}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4">
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
                className="mt-3 min-h-[212px] w-full resize-y rounded-[1.85rem] border border-line bg-[#fffdf8] p-5 text-[15px] leading-7 text-foreground outline-none transition placeholder:text-[#8b8175] focus:border-accent focus:ring-4 focus:ring-[rgba(201,111,59,0.16)]"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleGenerateFlow}
                  disabled={processText.trim().length === 0 || isGenerating}
                  className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:bg-[#2f2a24] disabled:cursor-not-allowed disabled:bg-[#7f766c]"
                >
                  {isGenerating
                    ? "Gerando..."
                    : hasGeneratedFlow
                      ? "Atualizar fluxo pelo texto"
                      : "Gerar fluxograma"}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateFlow}
                  disabled={processText.trim().length === 0 || isGenerating}
                  className="rounded-full border border-line bg-white/82 px-5 py-3 text-sm font-medium text-foreground transition hover:border-accent hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Gerar do zero
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleLoadExample}
                  className="rounded-full border border-line/80 bg-white/65 px-3.5 py-2 text-sm text-muted transition hover:border-accent hover:bg-white hover:text-foreground"
                >
                  Carregar exemplo
                </button>
                <button
                  type="button"
                  onClick={handleResetWorkbench}
                  disabled={isGenerating}
                  className="rounded-full border border-line/80 bg-transparent px-3.5 py-2 text-sm text-muted transition hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Limpar e recomecar
                </button>
                {visiblePromptChips.map((suggestion) => (
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
                {hasExtraPromptSuggestions ? (
                  <button
                    type="button"
                    onClick={() => setIsMorePromptSuggestionsVisible(true)}
                    className="rounded-full border border-dashed border-line bg-transparent px-3.5 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground"
                  >
                    Mais ideias
                  </button>
                ) : null}
              </div>

              {isPresentationMode ? (
                <div
                  className={`mt-3 flex flex-wrap items-center gap-3 rounded-[1.2rem] border px-4 py-3 transition-all duration-300 ${generationTone}`}
                >
                  <div
                    className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-300 ${
                      generationState.status === "success"
                        ? "bg-[#1f7a63] shadow-[0_0_0_8px_rgba(31,122,99,0.08)]"
                        : generationState.status === "error"
                          ? "bg-[#c96f3b] shadow-[0_0_0_8px_rgba(201,111,59,0.08)]"
                          : generationState.status === "loading"
                            ? "flowtalk-breath bg-[#45617f] shadow-[0_0_0_8px_rgba(69,97,127,0.08)]"
                            : "bg-[#b7ab9a]"
                    }`}
                  />
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                    {getGenerationEyebrow(generationState.status)}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {generationState.title}
                  </p>
                  <p className="text-sm leading-6 opacity-85">
                    {generationState.detail}
                  </p>
                </div>
              ) : (
                <div
                  className={`flowtalk-panel-lift mt-3 overflow-hidden rounded-[1.2rem] border px-4 py-3 transition-all duration-300 ${generationTone}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                        {getGenerationEyebrow(generationState.status)}
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-foreground">
                        {generationState.title}
                      </p>
                      <p className="mt-1.5 text-sm leading-6 opacity-85">
                        {generationState.detail}
                      </p>
                    </div>
                    <div
                      className={`mt-1 h-3 w-3 shrink-0 rounded-full transition-all duration-300 ${
                        generationState.status === "success"
                          ? "bg-[#1f7a63] shadow-[0_0_0_8px_rgba(31,122,99,0.08)]"
                          : generationState.status === "error"
                            ? "bg-[#c96f3b] shadow-[0_0_0_8px_rgba(201,111,59,0.08)]"
                            : generationState.status === "loading"
                              ? "flowtalk-breath bg-[#45617f] shadow-[0_0_0_8px_rgba(69,97,127,0.08)]"
                              : "bg-[#b7ab9a]"
                      }`}
                    />
                  </div>

                  <div className="mt-3 overflow-hidden rounded-full bg-white/45">
                    <div
                      className={`h-[3px] origin-left rounded-full transition-all duration-500 ${
                        generationState.status === "loading"
                          ? "flowtalk-loading-sheen w-2/3 bg-[linear-gradient(90deg,rgba(69,97,127,0.2),rgba(69,97,127,0.78),rgba(69,97,127,0.2))]"
                          : generationState.status === "success"
                            ? "w-full bg-[linear-gradient(90deg,rgba(31,122,99,0.35),rgba(31,122,99,0.9))]"
                            : generationState.status === "error"
                              ? "w-full bg-[linear-gradient(90deg,rgba(201,111,59,0.35),rgba(201,111,59,0.86))]"
                              : "w-1/4 bg-[rgba(92,88,79,0.18)]"
                      }`}
                    />
                  </div>
                </div>
              )}

              <div className="rounded-[1.6rem] border border-line bg-white/70 p-4 sm:p-4">
                <div className="flex flex-col gap-3 border-b border-line/80 pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
                      Refinamento textual
                    </p>
                    <h3 className="mt-1.5 text-[1.15rem] font-semibold tracking-[-0.03em]">
                      Evolua um fluxo ja gerado sem perder a base atual
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted">
                      Instrua pequenas mudancas e preserve a estrutura valida sempre que possivel.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRefinementText(exampleRefinementPrompt)}
                    className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent hover:bg-white"
                  >
                    Carregar instrucao exemplo
                  </button>
                </div>

                <div
                  className={`mt-3 rounded-[1.25rem] border border-line/80 bg-white/72 p-3.5 shadow-[0_12px_28px_rgba(38,32,24,0.04)] ${
                    isPresentationMode ? "bg-white/84" : ""
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                        Contexto do refinamento
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {refinementStatusTitle}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {refinementStatusDetail}
                      </p>
                    </div>

                    {hasGeneratedFlow ? (
                      <div className="flex gap-3">
                        <div className="rounded-full border border-line bg-white/82 px-4 py-2 text-sm text-muted">
                          {validation.nodeCount} nodes
                        </div>
                        <div className="rounded-full border border-line bg-white/82 px-4 py-2 text-sm text-muted">
                          {validation.edgeCount} edges
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <label
                  htmlFor="refinement-text"
                  className="mt-3 block font-mono text-xs uppercase tracking-[0.24em] text-muted"
                >
                  Instrucao de refinamento
                </label>
                <textarea
                  id="refinement-text"
                  value={refinementText}
                  onChange={(event) => setRefinementText(event.target.value)}
                  placeholder="Exemplo: adicione uma revisao comercial antes de validar o pagamento, mantendo o restante do fluxo"
                  className="mt-2.5 min-h-[112px] w-full resize-y rounded-[1.35rem] border border-line bg-[#fffdf8] p-4 text-[15px] leading-7 text-foreground outline-none transition placeholder:text-[#8b8175] focus:border-accent focus:ring-4 focus:ring-[rgba(201,111,59,0.16)]"
                />

                <div className="mt-3 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleRefineFlow}
                    disabled={refinementText.trim().length === 0 || !canRefine}
                    className="rounded-full bg-[#1f7a63] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#17614e] disabled:cursor-not-allowed disabled:bg-[#84a99d]"
                  >
                    Refinar fluxo atual
                  </button>
                  {!isPresentationMode ? (
                    <div className="rounded-full border border-line/80 bg-white/65 px-4 py-3 text-sm text-muted">
                      Gerar do zero cria uma nova estrutura. Refinar reaproveita o fluxo atual.
                    </div>
                  ) : (
                    <div className="rounded-full border border-[rgba(31,122,99,0.14)] bg-[rgba(239,250,245,0.82)] px-4 py-3 text-sm text-[#1d5f4f]">
                      Refinar mantem o fluxo atual como contexto da proxima versao.
                    </div>
                  )}
                  {visibleRefinementChips.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setRefinementText(suggestion)}
                      className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                  {hasExtraRefinementSuggestions ? (
                    <button
                      type="button"
                      onClick={() => setIsMoreRefinementSuggestionsVisible(true)}
                      className="rounded-full border border-dashed border-line bg-transparent px-3.5 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground"
                    >
                      Mais refinamentos
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {isTechnicalVisible && !isPresentationMode ? (
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
                    <div>output: flow-schema validado</div>
                    <div>mode: model-or-fallback</div>
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
                    O botao agora usa a camada real de geracao. Se a IA nao estiver
                    configurada ou falhar durante o desenvolvimento, o fallback
                    local pode assumir sem mudar a interface.
                  </div>
                </article>
              </div>
            ) : null}
          </div>
        </article>

        {!isPresentationMode ? (
          <aside>
            <div className="rounded-[1.55rem] border border-line/70 bg-white/58 p-3 shadow-[0_14px_38px_rgba(38,32,24,0.05)]">
              <button
                type="button"
                onClick={() => setIsSupportVisible((current) => !current)}
                className="flex w-full items-center justify-between gap-4 rounded-[1.1rem] px-2 py-2 text-left transition hover:bg-white/45"
              >
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted">
                    Conteudo secundario
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Ajuda rapida, direcao do produto e persistencia local.
                  </p>
                </div>
                <span className="rounded-full border border-line bg-white/72 px-3 py-1 text-sm text-muted">
                  {isSupportVisible ? "Ocultar" : "Expandir"}
                </span>
              </button>

              {isSupportVisible ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <article className="rounded-[1.35rem] border border-line/70 bg-white/72 p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted">
                      Guia rapido
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                      <li>Qual evento inicia o processo.</li>
                      <li>Quais etapas acontecem em sequencia.</li>
                      <li>Quais decisoes abrem caminhos diferentes.</li>
                      <li>Que situacoes fazem o fluxo voltar ou encerrar.</li>
                    </ul>
                  </article>

                  <article className="rounded-[1.35rem] border border-line/70 bg-white/72 p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted">
                      Direcao
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      A entrada em texto e a camada de produto. O editor JSON continua disponivel como camada tecnica e de depuracao.
                    </p>
                  </article>

                  <article className="rounded-[1.35rem] border border-line/70 bg-white/72 p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted">
                      Persistencia local
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      O texto principal, a instrucao de refinamento e o ultimo JSON valido ficam salvos neste navegador.
                    </p>
                  </article>
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}
      </section>

      <div className="grid gap-6 xl:col-start-2 xl:row-span-2 xl:row-start-1">
        <section className="grid gap-6">
          <section className="relative">
            <div className="absolute left-6 top-8 h-40 w-40 rounded-full bg-accent/18 blur-3xl sm:left-10" />
            <div className="absolute bottom-10 right-10 h-52 w-52 rounded-full bg-accent-strong/16 blur-3xl" />

            <div
              className={`relative overflow-hidden rounded-[2.6rem] border p-4 shadow-[0_34px_120px_rgba(38,32,24,0.14)] transition-all duration-500 sm:p-4 2xl:p-5 ${
                isGenerating
                  ? "border-[rgba(69,97,127,0.14)] shadow-[0_34px_120px_rgba(38,32,24,0.14),0_0_0_1px_rgba(69,97,127,0.04)]"
                  : generationState.status === "error"
                    ? "border-[rgba(201,111,59,0.16)]"
                    : isPreviewCelebrating
                      ? "border-[rgba(31,122,99,0.18)] shadow-[0_34px_120px_rgba(38,32,24,0.14),0_0_0_10px_rgba(31,122,99,0.05)]"
                      : "border-line"
              } ${isPresentationMode ? "bg-[rgba(255,250,242,0.92)] sm:p-6 2xl:p-7" : "bg-surface"}`}
            >
              <div className="mb-4 flex flex-col gap-3 border-b border-line/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
                    {isPresentationMode ? "Palco principal" : "Resultado principal"}
                  </p>
                  <h2 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.05em] sm:text-[2rem] 2xl:text-[2.2rem]">
                    {isPresentationMode
                      ? "Fluxograma pronto para demo"
                      : "Preview do fluxo pronto para uso"}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted sm:text-[15px]">
                    {isPresentationMode
                      ? "A visualizacao ganha mais respiracao e menos ruido para apresentar o produto com clareza, foco e impacto."
                      : "O diagrama assume o centro da pagina, com os controles certos e menos peso visual ao redor."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {!isPresentationMode ? (
                    <button
                      type="button"
                      onClick={() => setIsTechnicalVisible((current) => !current)}
                      className={`rounded-full border px-5 py-3 text-sm font-medium transition ${
                        isTechnicalVisible
                          ? "border-[rgba(31,122,99,0.18)] bg-[rgba(239,250,245,0.92)] text-[#1d5f4f] hover:border-[#1f7a63]"
                          : "border-line bg-white/72 text-muted hover:border-accent hover:bg-white hover:text-foreground"
                      }`}
                    >
                      {technicalToggleLabel}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleExportImage}
                    disabled={
                      isGenerating ||
                      exportState.status === "loading" ||
                      !isPreviewMounted
                    }
                    className="rounded-full border border-line bg-white/85 px-5 py-3 text-sm font-medium text-foreground transition hover:border-accent hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {exportState.status === "loading"
                      ? "Exportando..."
                      : "Exportar imagem"}
                  </button>
                </div>
              </div>

              {isPresentationMode ? (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[1.45rem] border border-line/80 bg-white/76 px-4 py-3">
                  <div className={`rounded-full border px-3 py-1.5 text-sm ${generationTone}`}>
                    {generationState.title}
                  </div>
                  <div className="rounded-full border border-line bg-white/82 px-3 py-1.5 text-sm text-muted">
                    {validation.nodeCount} nodes
                  </div>
                  <div className="rounded-full border border-line bg-white/82 px-3 py-1.5 text-sm text-muted">
                    {validation.edgeCount} edges
                  </div>
                  <div className="rounded-full border border-line bg-white/82 px-3 py-1.5 text-sm text-muted">
                    {validation.status === "valid"
                      ? "Estrutura valida"
                      : "Revisao pendente"}
                  </div>
                </div>
              ) : (
                <div className="mb-3 flex flex-wrap items-center gap-2.5">
                  <div
                    className={`rounded-full border px-3.5 py-2 text-sm transition ${generationTone}`}
                  >
                    {generationState.title}
                  </div>
                  <div className="rounded-full border border-line/80 bg-white/72 px-3.5 py-2 text-sm text-muted shadow-[0_12px_28px_rgba(38,32,24,0.04)]">
                    {validation.nodeCount} nodes
                  </div>
                  <div className="rounded-full border border-line/80 bg-white/72 px-3.5 py-2 text-sm text-muted shadow-[0_12px_28px_rgba(38,32,24,0.04)]">
                    {validation.edgeCount} edges
                  </div>
                  <div className="rounded-full border border-line/80 bg-white/72 px-3.5 py-2 text-sm text-muted shadow-[0_12px_28px_rgba(38,32,24,0.04)]">
                    {validation.status === "valid"
                      ? "Estrutura valida"
                      : "Revisao pendente"}
                  </div>
                </div>
              )}

              {!isTechnicalVisible && !isPresentationMode ? (
                <div className="mb-3 flex flex-col gap-2 rounded-[1.3rem] border border-line/80 bg-white/72 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted">
                      Camada tecnica recolhida
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      O JSON continua disponivel a um clique de distancia para inspecao e depuracao.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTechnicalVisible(true)}
                    className="rounded-full border border-line bg-white/85 px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent hover:bg-white"
                  >
                    Ver estrutura tecnica
                  </button>
                </div>
              ) : null}

              {exportState.status !== "idle" ? (
                <div
                  className={`mb-3 rounded-[1.2rem] border p-3 transition ${exportTone}`}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                    Exportacao
                  </p>
                  <p className="mt-2 text-sm leading-6 opacity-85">
                    {exportState.message}
                  </p>
                </div>
              ) : null}

              {isGenerating ? (
                <div className="pointer-events-none absolute inset-x-5 top-5 z-10 flex justify-end">
                  <div className="flowtalk-panel-lift flowtalk-loading-sheen overflow-hidden rounded-[1.2rem] border border-[rgba(34,56,84,0.12)] bg-white/88 px-4 py-3 text-sm text-[#31465d] shadow-[0_18px_40px_rgba(38,32,24,0.12)] backdrop-blur">
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#6c8197]">
                      Atualizando preview
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#31465d]">
                      {generationState.title}
                    </p>
                    <p className="mt-1 text-[13px] leading-5 text-[#51657a]">
                      Mantendo o ultimo resultado visivel enquanto o fluxo novo fica pronto.
                    </p>
                  </div>
                </div>
              ) : null}

              {generationState.status === "success" ? (
                <div className="pointer-events-none absolute inset-x-5 top-5 z-10 flex justify-end">
                  <div
                    className={`rounded-full border border-[rgba(31,122,99,0.18)] bg-[rgba(239,250,245,0.92)] px-4 py-2 text-sm text-[#1d5f4f] shadow-[0_18px_40px_rgba(38,32,24,0.1)] backdrop-blur transition-all duration-500 ${
                      isPreviewCelebrating
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {generationState.source === "simulator"
                      ? "Preview atualizado em modo local"
                      : "Preview atualizado"}
                  </div>
                </div>
              ) : null}

              {generationState.status === "error" ? (
                <div className="pointer-events-none absolute inset-x-5 bottom-5 z-10 flex justify-start">
                  <div className="rounded-[1.15rem] border border-[rgba(201,111,59,0.18)] bg-[rgba(255,246,239,0.9)] px-4 py-3 text-sm text-[#8f4a22] shadow-[0_16px_34px_rgba(38,32,24,0.08)] backdrop-blur">
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#b46b40]">
                      Resultado anterior preservado
                    </p>
                    <p className="mt-1 text-[13px] leading-5 text-[#8f4a22]">
                      O preview atual continua disponivel enquanto ajustamos a proxima tentativa.
                    </p>
                  </div>
                </div>
              ) : null}

              <div
                className={`transition-all duration-500 ${
                  isGenerating
                    ? "scale-[0.995] opacity-[0.82]"
                    : "scale-100 opacity-100"
                }`}
              >
                {isPreviewMounted ? (
                  <FlowPreview
                    document={document}
                    presentationMode={isPresentationMode}
                  />
                ) : (
                  <div
                    id={FLOW_PREVIEW_EXPORT_ID}
                    className="flex w-full items-center justify-center overflow-hidden rounded-[2rem] border border-[rgba(28,27,25,0.08)] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.88),rgba(252,246,237,0.95))] shadow-[0_34px_120px_rgba(38,32,24,0.16)]"
                    style={{ height: previewCanvasHeight }}
                  >
                    <div className="rounded-full border border-line bg-white/88 px-4 py-2 text-sm text-muted shadow-[0_18px_40px_rgba(38,32,24,0.08)]">
                      Montando preview do fluxograma...
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </section>
      </div>

      {isTechnicalVisible && !isPresentationMode ? (
        <div className="grid gap-8 xl:col-span-2 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
          <aside className="space-y-4 xl:sticky xl:top-8">
            <article className="rounded-[2rem] border border-line bg-surface p-5 shadow-[var(--shadow)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted">
                    Fonte
                  </p>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                    JSON dirigido por schema
                  </h2>
                </div>
                <span className="rounded-full border border-line bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Tecnico
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                O diagrama nasce do JSON do projeto. Aqui voce pode validar schema,
                inspecionar estrutura e depurar a camada de geracao sem competir com
                a experiencia principal.
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
          </section>
        </div>
      ) : null}
    </div>
  );
}
