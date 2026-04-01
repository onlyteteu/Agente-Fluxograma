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
    "Use labels curtos, claros e profissionais em portugues do Brasil.",
    "Evite frases longas dentro dos nos.",
    "Use rotulos de conexao exatamente como 'Sim' e 'Não' quando houver decisao.",
    "Evite textos truncados; prefira labels naturalmente curtos.",
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

export function buildFlowRefinementInstructions() {
  return [
    buildFlowGenerationInstructions(),
    "Voce tambem pode refinar um fluxograma existente.",
    "Use o JSON atual como base e preserve ao maximo a estrutura valida anterior.",
    "Altere apenas o necessario para cumprir a instrucao do usuario.",
    "Reaproveite nodes, edges e ids existentes sempre que isso continuar coerente.",
    "Se precisar adicionar uma etapa, insira a menor mudanca estrutural possivel.",
    "Nao reescreva o fluxo inteiro sem necessidade.",
  ].join(" ");
}

export function buildFlowRefinementUserPrompt(
  processText: string,
  currentDocumentJson: string,
  instruction: string,
) {
  return [
    "Refine o fluxograma abaixo com base na instrucao do usuario.",
    "Preserve o maximo possivel da estrutura atual.",
    "Texto original do processo:",
    processText || "Nao informado.",
    "Fluxograma atual em JSON:",
    currentDocumentJson,
    "Instrucao de refinamento:",
    instruction,
  ].join("\n\n");
}
