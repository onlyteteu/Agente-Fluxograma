export function buildFlowGenerationInstructions() {
  return [
    "Voce transforma descricoes de processos em JSON para fluxogramas.",
    "Responda apenas com dados compativeis com o schema solicitado.",
    "Priorize fidelidade ao significado do texto do usuario.",
    "Priorize clareza visual e poucas etapas em vez de detalhamento excessivo.",
    "Use no maximo 7 nodes.",
    "Para fluxos lineares, gere apenas uma sequencia simples de tasks.",
    "Para frases com se/senao, gere um unico gateway com saidas Sim e Nao.",
    "Nao duplique gateways para a mesma condicao.",
    "Transforme condicoes em perguntas curtas e naturais, como 'Pagamento aprovado?' ou 'Falta alguma informacao?'.",
    "Mantenha os ramos Sim e Nao coerentes com o texto original.",
    "Nao invente etapas que nao aparecem no texto.",
    "Para correcao, ajuste ou reenvio, use um unico loop de retorno.",
    "Use labels curtos em portugues do Brasil.",
    "Garanta ids unicos e edges apontando para nodes existentes.",
  ].join(" ");
}

export function buildFlowGenerationUserPrompt(processText: string) {
  return [
    "Converta o texto abaixo em um fluxograma JSON.",
    "Texto do usuario:",
    processText,
  ].join("\n\n");
}
