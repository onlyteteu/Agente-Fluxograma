export default function Home() {
  return (
    <main className="grain flex min-h-screen flex-col overflow-hidden">
      <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between border-b border-line pb-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted">
              FlowTalk
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">
              Texto em fluxo visual
            </h1>
          </div>
          <div className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted shadow-[var(--shadow)]">
            Next.js + TypeScript + Tailwind
          </div>
        </header>

        <div className="grid flex-1 gap-10 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-line bg-surface px-4 py-2 text-sm shadow-[var(--shadow)]">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              <span className="text-muted">
                MVP orientado a fluxogramas bonitos e editaveis
              </span>
            </div>

            <div className="max-w-3xl space-y-6">
              <h2 className="text-5xl font-semibold leading-none tracking-[-0.05em] text-balance sm:text-6xl lg:text-7xl">
                Descreva um processo.
                <span className="block text-accent-strong">
                  Receba um fluxograma elegante.
                </span>
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-muted sm:text-xl">
                Esta base inicial prepara o produto para o fluxo central do
                projeto: texto, interpretacao por IA, JSON validado e um
                diagrama com presenca visual desde o primeiro contato.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="rounded-[2rem] bg-foreground px-6 py-4 text-background shadow-[var(--shadow)]">
                Comecar a interface conversacional
              </div>
              <div className="rounded-[2rem] border border-line bg-surface px-6 py-4 text-muted">
                Proximo passo: integrar React Flow + IA
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-[2rem] border border-line bg-surface p-5 shadow-[var(--shadow)]">
                <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted">
                  Entrada
                </p>
                <h3 className="mt-4 text-xl font-medium">Prompt livre</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  O usuario descreve o processo em linguagem natural.
                </p>
              </article>
              <article className="rounded-[2rem] border border-line bg-surface p-5 shadow-[var(--shadow)]">
                <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted">
                  Estrutura
                </p>
                <h3 className="mt-4 text-xl font-medium">JSON validado</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  A IA organiza etapas, condicoes e conexoes para o diagrama.
                </p>
              </article>
              <article className="rounded-[2rem] border border-line bg-surface p-5 shadow-[var(--shadow)]">
                <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted">
                  Resultado
                </p>
                <h3 className="mt-4 text-xl font-medium">Fluxograma bonito</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Layout automatico com acabamento visual como parte do produto.
                </p>
              </article>
            </div>
          </section>

          <aside className="relative">
            <div className="absolute -left-6 top-10 h-24 w-24 rounded-full bg-accent/20 blur-2xl" />
            <div className="absolute -right-4 bottom-12 h-32 w-32 rounded-full bg-accent-strong/20 blur-3xl" />

            <div className="relative rounded-[2rem] border border-line bg-surface-strong p-5 shadow-[var(--shadow)]">
              <div className="rounded-[1.5rem] border border-line bg-[#fffdf8] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
                      Exemplo
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">
                      Processo de onboarding
                    </h3>
                  </div>
                  <div className="rounded-full bg-accent px-3 py-1 font-mono text-xs uppercase tracking-[0.24em] text-white">
                    Preview
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-[1.25rem] border border-line bg-white p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
                      Entrada
                    </p>
                    <p className="mt-2 text-base font-medium">
                      Usuario envia descricao do fluxo
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <div className="h-10 w-px bg-gradient-to-b from-accent to-accent-strong" />
                  </div>

                  <div className="rounded-[1.25rem] border border-line bg-white p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
                      IA
                    </p>
                    <p className="mt-2 text-base font-medium">
                      Interpreta etapas, decisoes e dependencias
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 rounded-[1.25rem] border border-line bg-white p-4">
                      <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
                        Sim
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        Gera estrutura valida
                      </p>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-accent to-accent-strong" />
                    <div className="flex-1 rounded-[1.25rem] border border-dashed border-line bg-white/80 p-4">
                      <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
                        Nao
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        Ajusta instrucoes e tenta novamente
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="h-10 w-px bg-gradient-to-b from-accent-strong to-foreground" />
                  </div>

                  <div className="rounded-[1.25rem] border border-line bg-[#1f1c18] p-4 text-white">
                    <p className="font-mono text-xs uppercase tracking-[0.24em] text-white/60">
                      Saida
                    </p>
                    <p className="mt-2 text-base font-medium">
                      Fluxograma pronto para visualizar e editar
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
