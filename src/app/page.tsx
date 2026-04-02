"use client";

import { useState } from "react";
import { FlowWorkbench } from "@/components/flow-workbench";

export default function Home() {
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  return (
    <main className="grain min-h-screen overflow-hidden">
      <section
        className={`mx-auto flex w-full flex-col px-5 sm:px-8 lg:px-10 ${
          isPresentationMode
            ? "max-w-[1760px] py-5"
            : "max-w-[1680px] py-6"
        }`}
      >
        <header
          className={`flex flex-col gap-5 transition-all duration-300 lg:flex-row lg:justify-between ${
            isPresentationMode
              ? "items-start rounded-[2rem] border border-line/70 bg-white/52 px-5 py-5 shadow-[0_20px_60px_rgba(38,32,24,0.08)] lg:items-center"
              : "border-b border-line pb-6 lg:items-end"
          }`}
        >
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted">
              {isPresentationMode ? "FlowTalk Demo" : "FlowTalk"}
            </p>
            <h1 className="mt-3 text-[2.5rem] font-semibold tracking-[-0.05em] text-balance sm:text-[3.25rem] lg:text-[4.1rem]">
              {isPresentationMode
                ? "Entrada, refinamento e diagrama no centro da experiencia."
                : "Entrada em texto primeiro. JSON e diagrama como camada viva logo depois."}
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted sm:text-base">
              {isPresentationMode
                ? "Modo apresentacao ativo para demos e pitch: menos ruido visual, mais palco para o texto, o refinamento e o fluxograma."
                : "A experiencia agora comeca pela descricao do processo em linguagem natural, mas preserva a trilha tecnica de schema, validacao e renderizacao visual para a futura integracao com IA."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsPresentationMode((current) => !current)}
              className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                isPresentationMode
                  ? "border border-[rgba(31,122,99,0.18)] bg-[rgba(239,250,245,0.92)] text-[#1d5f4f] hover:border-[#1f7a63]"
                  : "border border-line bg-surface text-foreground shadow-[var(--shadow)] hover:border-accent hover:bg-white"
              }`}
            >
              {isPresentationMode
                ? "Voltar ao modo normal"
                : "Ativar modo apresentacao"}
            </button>
            {isPresentationMode ? (
              <div className="rounded-full border border-line/80 bg-white/72 px-4 py-3 text-sm text-muted">
                Demo mais limpa e impactante
              </div>
            ) : (
              <>
                <div className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted shadow-[var(--shadow)]">
                  Fluxo visual
                </div>
                <div className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted shadow-[var(--shadow)]">
                  Entrada textual
                </div>
                <div className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted shadow-[var(--shadow)]">
                  Refinamento guiado
                </div>
              </>
            )}
          </div>
        </header>

        <div className="py-8">
          <FlowWorkbench isPresentationMode={isPresentationMode} />
        </div>
      </section>
    </main>
  );
}
