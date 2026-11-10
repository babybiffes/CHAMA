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

## Vozes (gratuitas, sem "Create new voice")

Tudo é feito no **"Create new dialog"**, usando as vozes prontas do AI Studio. O sotaque e o jeito de cada um vêm da **descrição da cena**. Use sempre a mesma voz para cada personagem em todos os episódios:

| Personagem | Voz pronta | Alternativa |
|---|---|---|
| Bento (gaúcho) | **Algenib** (grave, rouca) | Alnilam |
| Geraldim (mineiro) | **Umbriel** (calma) | Achird |
| Rai (baiano) | **Puck** (animada) | Sadachbia |
| Caio (paulista) | **Fenrir** (agitada) | Zubenelgenubi |

## Passo 2 — Gerar a conversa

Volte ao Playground e toque em **"Create new dialog"**.

1. **Adicione os personagens (speakers)** e escolha para cada um a voz pronta da tabela acima. O nome do speaker tem que ser **igual** ao que está no texto: `Bento`, `Caio`, `Geraldim`, `Rai`.
2. **Descrição da cena / estilo** — aqui vai o sotaque de cada um (cole tudo):
```
Quatro amigos de regiões diferentes do Brasil conversando de noite atrás de um armazém, perto da rodoviária, antes de uma viagem. Papo de rua, rápido, natural e cheio de zoeira, como um áudio gravado no celular no meio do grupo. Um responde o outro sem pausa longa, às vezes quase em cima da fala do outro. Ninguém fala como locutor.
Bento: gaúcho de Bagé, 30 anos, voz grave e rouca, confiante, sotaque da fronteira com o "e" final fechado ("tchê", "guri"), "Bah" curto, melodia que sobe no meio e cai no fim. É o guia da turma.
Caio: paulistano da Mooca, 27 anos, fala rápida e emendada, "mano" bem paulista, "não" nasal. Reclama e zoa os amigos com intimidade; o "cuzão" é brincadeira.
Geraldim: mineiro de Sabará, 28 anos, fala mansa, baixa e devagar, de boca cheia de pão de queijo, comendo sílabas ("Nu meu fi" quase "numêfi"), "uai" e "sô", frase que sobe no fim. Desconfiado.
Rai: baiano de Salvador, 25 anos, voz alegre e risonha, vogais abertas, ritmo cantado, "Oxe" esticado e "véi" arrastado. Ri de tudo e apressa a turma.
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
