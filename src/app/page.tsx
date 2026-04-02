import { FlowWorkbench } from "@/components/flow-workbench";

export default function Home() {
  return (
    <main className="grain min-h-screen overflow-hidden">
      <section className="mx-auto flex w-full max-w-[1680px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-line pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted">
              FlowTalk
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-balance sm:text-5xl lg:text-6xl">
              Entrada em texto primeiro. JSON e diagrama como camada viva logo depois.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              A experiencia agora comeca pela descricao do processo em linguagem
              natural, mas preserva a trilha tecnica de schema, validacao e
              renderizacao visual para a futura integracao com IA.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted shadow-[var(--shadow)]">
              React Flow
            </div>
            <div className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted shadow-[var(--shadow)]">
              Dagre auto-layout
            </div>
            <div className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted shadow-[var(--shadow)]">
              Entrada textual
            </div>
            <div className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted shadow-[var(--shadow)]">
              JSON validado
            </div>
          </div>
        </header>

        <div className="py-8">
          <FlowWorkbench />
        </div>
      </section>
    </main>
  );
}
