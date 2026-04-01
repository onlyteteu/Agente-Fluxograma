import { FlowPreview } from "@/components/flow-preview";

export default function Home() {
  return (
    <main className="grain min-h-screen overflow-hidden">
      <section className="mx-auto flex w-full max-w-[1500px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-line pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted">
              FlowTalk
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-balance sm:text-5xl lg:text-6xl">
              Fluxograma mockado com foco em ritmo visual, espaco e clareza.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Esta primeira versao usa React Flow com dados mockados para provar
              o coracao visual do produto: um diagrama limpo, respirado e com
              presenca editorial.
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
              Dados mockados
            </div>
          </div>
        </header>

        <div className="grid gap-8 py-8 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
          <aside className="space-y-4 xl:sticky xl:top-8">
            <article className="rounded-[2rem] border border-line bg-surface p-5 shadow-[var(--shadow)]">
              <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted">
                Objetivo
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                Beleza nao e detalhe
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                O layout foi montado para evitar aglomeracao, reforcar hierarquia
                e manter as decisoes legiveis mesmo com multiplos caminhos.
              </p>
            </article>

            <article className="rounded-[2rem] border border-line bg-surface p-5 shadow-[var(--shadow)]">
              <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted">
                Mock
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
                <li>Fluxo de texto ate renderizacao do diagrama</li>
                <li>No de decisao com caminho de retorno</li>
                <li>Auto-layout com espacamento vertical amplo</li>
              </ul>
            </article>

            <article className="rounded-[2rem] border border-line bg-[#1f1c18] p-5 text-white shadow-[var(--shadow)]">
              <p className="font-mono text-xs uppercase tracking-[0.26em] text-white/60">
                Proximo passo
              </p>
              <p className="mt-4 text-sm leading-6 text-white/78">
                Na sequencia, podemos trocar o mock por um editor real com input
                de texto, schema e geracao dinamica de nos.
              </p>
            </article>
          </aside>

          <section className="relative">
            <div className="absolute left-8 top-10 h-32 w-32 rounded-full bg-accent/15 blur-3xl" />
            <div className="absolute bottom-10 right-12 h-40 w-40 rounded-full bg-accent-strong/15 blur-3xl" />

            <div className="relative rounded-[2.25rem] border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
              <FlowPreview />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
