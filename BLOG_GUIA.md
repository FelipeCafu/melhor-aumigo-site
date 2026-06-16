# Guia do Blog do Aumigo — publicação 2x/semana (Claude)

Este guia ensina o Claude a criar uma nova matéria do blog do **Melhor Aumigo Pet Shop**.
Cadência sugerida: **2 posts por semana** (ex.: terça e sexta).

---

## Como funciona a estrutura

```
Site_MelhorAumigo/
  blog/
    index.html          ← listagem (NÃO precisa editar; lê o posts.json sozinho)
    posts.json          ← índice de todas as matérias (EDITAR a cada post)
    posts/
      <slug>.html       ← a matéria em si (CRIAR a cada post)
```

A home (`index.html`) e a listagem (`blog/index.html`) mostram automaticamente os
posts a partir do `posts.json`. **O post mais novo deve ficar no topo do array.**

---

## Passo a passo para criar um post

1. **Escolha um tema** (lista de ideias abaixo) que ajude a vender serviços/produtos
   falando dos BENEFÍCIOS, com fontes confiáveis.
2. **Crie o arquivo** `blog/posts/<slug>.html` copiando um post existente como modelo
   (ex.: `linha-hydra-por-que-profissionais-usam.html`). Troque: title, meta description,
   canonical, JSON-LD (headline/description/datePublished), categoria, h1, data, conteúdo,
   o emoji da capa e as fontes.
3. **Adicione a entrada no TOPO do `posts.json`:**

```json
{
  "slug": "nome-do-arquivo-sem-html",
  "titulo": "Título chamativo da matéria",
  "resumo": "1–2 frases que dão vontade de clicar.",
  "categoria": "Banho",
  "data": "16 jun 2026",
  "tempoLeitura": "5 min de leitura"
}
```

   Categorias válidas (já têm emoji/cor): **Banho, Tosa, Saúde, Produtos, Nutrição,
   Comportamento, Cuidados**.
4. **Pronto.** A home e a listagem já mostram o novo post automaticamente.

---

## Regras de qualidade (importantes)

- **Tudo em português do Brasil.** Nada de "fear free", "low stress" etc. — use
  "banho sem estresse", "manejo calmo e com paciência".
- **Sempre cite fontes confiáveis** no fim (veterinárias, Petz/Cobasi, sites oficiais
  de marcas, associações). Nunca invente dados nem nomes de produtos.
- **Foco em VALOR, não em preço.** Venda o benefício (saúde, bem-estar, resultado),
  nunca "o mais barato".
- **Sempre inclua o bloco `.callout`** com um CTA pro WhatsApp
  `https://wa.me/5561991592662` e mensagem pré-preenchida.
- **SEO local:** use palavras como *banho e tosa Brasília*, *Cruzeiro Velho*,
  *tosa higiênica*, *cães ansiosos* etc. de forma natural no texto.
- **Tom da marca:** afetivo, acolhedor, brincalhão na medida (🐾), mas com ar premium.
- Termine sempre com o bloco `.article-author` (Equipe Melhor Aumigo, 30 anos).
- Inclua o `BlogPosting` em JSON-LD com a data correta.

---

## Banco de ideias de pauta (girar entre estas)

**Banho / Tosa**
- Tosa higiênica: o que é e por que importa
- Remoção de subpelo: quando e por quê (troca de pelagem)
- Tosa na tesoura x máquina: qual escolher
- Por que o secador profissional faz diferença

**Hidratação / Produtos**
- Hidratação de pelos: pelo brilhante e sem nós
- Como escolher um shampoo de qualidade / hipoalergênico
- Colônias e perfumes pet: o cheirinho que dura (linha Forever / Pet Spa Senses)
- Diferença entre shampoo de pelos claros e escuros (Hydra)

**Saúde / Comportamento**
- Cães ansiosos: banho com calma e paciência *(publicado)*
- Sinais de problema de pele que aparecem no banho
- Cuidado com filhotes e cães idosos no banho
- Pelo embolado: como prevenir nós

**Nutrição**
- Benefícios de uma boa ração para pele e pelo
- Ração premium x comum: o que muda no banho/pelagem

**Comodidade / Serviço**
- Taxi Dog: como funciona o leva e traz
- Rotina de banho ideal por raça/porte
- Como é uma experiência de Pet Spa

---

## Datas
Converter sempre datas relativas em absolutas no momento de publicar
(ex.: "hoje" → "16 jun 2026"). A data no `posts.json` usa formato curto
("16 jun 2026") e no JSON-LD do HTML usa ISO ("2026-06-16").
