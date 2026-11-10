# 🎙️ Parte 01 · Cena 1 — conversa natural + passo a passo no AI Studio (Playground)

## O diálogo (versão final da cena 1)

```
BENTO:    Bah, ó… a entrada é pelos fundos, tchê.
CAIO:     Pelos fundos? Cê tá de brincadeira, né, mano?
BENTO:    Confia, guri. Eu sei o caminho.
CAIO:     Sabe nada…
          (câmera olha a rua — fumaça, sirene)
GERALDIM: Nu meu fi… cês viram aquela fumaça ali?
RAI:      Hã? Que fumaça, véi?
GERALDIM: Ali, ó! Atrás dos prédio. Esse trem tá esquisito demais, sô.
RAI:      Oxe, é churrasco, Geraldim! Relaxe vu.
GERALDIM: Churrasco, uai? A essa hora?
RAI:      Ó a hora, véi… o ônibus sai dez e quarenta. Arroche, arroche!
BENTO:    Bora, moçada, bora!
          (eles andam até a DOCA 2)
CAIO:     Mano… isso aqui não tem cara de rodoviária não, cuzão.
BENTO:    Ouvi, hein! Vem logo, é ali!
```

O que deixa a conversa real: **respostas curtas** ("Sabe nada…", "Hã?"), **pergunta respondida com outra pergunta** ("Churrasco, uai? A essa hora?"), **muletas de fala** ("ó", "hã", "né"), **zoeira** e **ninguém fala muito de uma vez**.

---

## Passo 1 — Criar a voz de cada personagem (uma vez só)

Na tela do Playground, toque em **"Create new voice"** e crie as 4 vozes abaixo, uma por vez. Cole a descrição, gere a amostra, ouça e salve com o nome do personagem. Assim os 4 têm sempre a **mesma voz** em todos os episódios.

**Bento** (salve como "Bento")
```
Homem gaúcho de 30 anos, de Bagé, na fronteira do Rio Grande do Sul. Voz grave, um pouco rouca, firme e confiante, de quem gosta de mandar na turma. Sotaque gaúcho da campanha bem natural: o "e" final fechado ("tchê", "guri"), "s" seco, melodia que sobe no meio da frase e desce no fim, leve jeito castelhano. Fala como gente de verdade, sem voz de locutor.
```
Frase de teste: `Bah, ó… a entrada é pelos fundos, tchê. Confia, guri.`

**Geraldim** (salve como "Geraldim")
```
Homem mineiro de 28 anos, de Sabará, interior de Minas. Voz mansa, baixa e calma, de gente simples e desconfiada. Sotaque mineiro forte e natural: emenda as palavras e come sílabas ("cês", "num", "Nu meu fi" sai quase "numêfi"), vogais fechadinhas, frase que termina subindo. "Uai" e "sô" bem naturais. Fala devagar, às vezes de boca cheia.
```
Frase de teste: `Nu meu fi… esse trem tá esquisito demais, sô.`

**Rai** (salve como "Rai")
```
Rapaz baiano de 25 anos, de Itapuã, Salvador. Voz alegre, solta e risonha, de quem zoa todo mundo. Sotaque soteropolitano natural: vogais bem abertas, ritmo cantado que acelera e freia, "Oxe" esticado, "véi" arrastado no fim das frases. Fala rindo, sem voz de locutor.
```
Frase de teste: `Oxe, relaxe vu, véi! Arroche, arroche!`

**Caio** (salve como "Caio")
```
Rapaz paulistano de 27 anos, da Mooca, São Paulo. Voz jovem e rápida, meio ansiosa. Sotaque paulistano natural: fala emendada, "mano" e "meu" bem paulistas, "não" e "ão" nasais, melodia levemente cantada da Mooca. Zoa os amigos com intimidade. Voz próxima, como quem fala do seu lado, sem voz de locutor.
```
Frase de teste: `Mano… cê tá de brincadeira, né, meu?`

> Se não gostar da amostra, gere de novo ou acrescente na descrição "carregue mais no sotaque".

---

## Passo 2 — Gerar a conversa

Volte ao Playground e toque em **"Create new dialog"**.

1. **Adicione os personagens (speakers)** e escolha para cada um a voz que você criou no Passo 1. O nome do speaker tem que ser **igual** ao que está no texto: `Bento`, `Caio`, `Geraldim`, `Rai`.
2. **Descrição da cena / estilo** (se o campo existir, cole isto):
```
Quatro amigos de regiões diferentes do Brasil conversando de noite atrás de um armazém, perto da rodoviária, antes de uma viagem. Papo de rua, rápido, natural e cheio de zoeira, como um áudio gravado no celular no meio do grupo. Um responde o outro sem pausa longa, às vezes quase em cima da fala do outro. Ninguém fala como locutor. O lugar é meio sinistro, então o Geraldim fica desconfiado, o Rai ri de tudo, o Bento é o guia confiante e o Caio reclama.
```
3. **Cole o texto da conversa** no formato `Nome: fala`, um por linha:

```
Bento: Bah, ó… a entrada é pelos fundos, tchê.
Caio: Pelos fundos? Cê tá de brincadeira, né, mano?
Bento: Confia, guri. Eu sei o caminho.
Caio: Sabe nada…
Geraldim: Nu meu fi… cês viram aquela fumaça ali?
Rai: Hã? Que fumaça, véi?
Geraldim: Ali, ó! Atrás dos prédio. Esse trem tá esquisito demais, sô.
Rai: Oxe, é churrasco, Geraldim! Relaxe vu.
Geraldim: Churrasco, uai? A essa hora?
Rai: Ó a hora, véi… o ônibus sai dez e quarenta. Arroche, arroche!
Bento: Bora, moçada, bora!
Caio: Mano… isso aqui não tem cara de rodoviária não, cuzão.
Bento: Ouvi, hein! Vem logo, é ali!
```
4. **Gere**, ouça, gere de novo se precisar, e **baixe** o áudio.

### Se o "Create new dialog" aceitar só 2 personagens por vez
Gere em 4 partes, cada uma com 2 speakers, e me mande os arquivos nesta ordem:

| Parte | Speakers | Linhas |
|---|---|---|
| **A** | Bento + Caio | "Bah, ó…" até "Sabe nada…" |
| **B** | Geraldim + Rai | "Nu meu fi…" até "Arroche, arroche!" |
| **C** | Bento sozinho | "Bora, moçada, bora!" |
| **D** | Caio + Bento | "Mano… isso aqui…" e "Ouvi, hein!…" |

> Pode me mandar **um arquivo só com a conversa inteira** ou as partes A–D. Eu cuido do resto: corto, encaixo cada fala no momento certo do vídeo (a câmera olha a rua entre "Sabe nada…" e "Nu meu fi…", e o grupo começa a andar depois de "Bora, moçada, bora!"), e as bocas mexem pelo volume real de cada voz.

### Dicas
- **Risada:** no texto, escreva `(rindo)` antes da fala, ex.: `Rai: (rindo) Oxe, é churrasco, Geraldim!`. Se o modelo ler a palavra em voz alta, tire e coloque na descrição da cena ("o Rai fala rindo").
- **Ritmo:** se ficar devagar, acrescente na descrição "falam rápido, um em cima do outro".
- **Sotaque fraco:** acrescente "carreguem mais nos sotaques regionais".
