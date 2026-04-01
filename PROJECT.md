# FlowTalk

## Visão
Aplicação SaaS que transforma descrições em linguagem natural em fluxogramas automaticamente, com foco em estética e simplicidade.

## Objetivo
Permitir que usuários descrevam processos e recebam fluxogramas visuais bonitos sem precisar montar manualmente.

## Diferencial
- Geração automática via IA
- Interface conversacional
- Layout bonito e organizado (principal diferencial)

## MVP
- Input de texto
- IA gera JSON
- JSON vira fluxograma
- Visual bonito com auto layout
- Edição simples

## Stack sugerida
- Front: Next.js + TypeScript + Tailwind
- Diagrama: React Flow + Dagre
- Backend: Node ou FastAPI
- IA: API LLM

## Fluxo
Texto → IA → JSON → Validação → Diagrama

## Regra principal
Beleza do fluxograma NÃO é detalhe, é core do produto.
