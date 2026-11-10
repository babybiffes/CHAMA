# 🎙️ Parte 01 · Cena 1 — diálogo natural (Google AI Studio, modo de 2 vozes)

**Por que mudou:** antes eram 5 falas soltas, cada um falando sozinho. Numa conversa de verdade um responde o outro, interrompe e ri. Por isso a cena agora tem trocas curtas, e o melhor jeito de gerar é no **modo Multi-speaker** do AI Studio: ele gera os dois falando **juntos numa mesma conversa**, com o tempo de resposta e a entonação de quem está respondendo alguém.

**Como gerar cada bloco:**
1. Em **Generate speech**, escolha **Multi-speaker**.
2. Em **Speaker 1** e **Speaker 2**, escreva os nomes **exatamente** como aparecem no texto (ex.: `Bento` e `Caio`) e escolha a voz de cada um.
3. Cole o **Style** no campo de instruções e o **Texto** (com os nomes antes de cada fala) na caixa de texto.
4. Gere 3 ou 4 vezes e fique com a mais natural.

São 4 arquivos de áudio no total (A, B, C e D). Me mande nessa ordem.

---

## Bloco A — Bento + Caio (o caminho pelos fundos)
**Speaker 1:** `Bento` · voz **Algenib** — **Speaker 2:** `Caio` · voz **Fenrir**
**Style:**
```
Dois amigos conversando de noite na rua, atrás de um armazém, num papo rápido e descontraído, como áudio gravado no celular, sem voz de locutor.
Bento é gaúcho de Bagé, 30 anos: voz grave e rouca, confiante, sotaque da fronteira com o "e" final fechado ("fundos, tchê", "guri"), "Bah" curto, melodia que sobe no meio e cai no fim. Fala como o guia da turma, meio convencido.
Caio é paulistano da Mooca, 27 anos: fala rápida e emendada, "mano" bem paulista, "não" e "ão" bem nasais. Ele estranha a ideia e responde quase rindo, desconfiado.
O "Confia, guri." sai curto e tranquilo, depois de um gole de chimarrão, encerrando o assunto.
```
**Texto:**
```
Bento: Bah, ó… a entrada da rodoviária é pelos fundos, tchê. Eu sei o caminho.
Caio: Pelos fundos, Bento? Sério, mano?
Bento: Confia, guri.
```

---

## Bloco B — Geraldim + Rai (a fumaça)
**Speaker 1:** `Geraldim` · voz **Umbriel** — **Speaker 2:** `Rai` · voz **Puck**
**Style:**
```
Dois amigos conversando de noite na rua, num papo natural de amigos, como áudio de celular, sem voz de locutor.
Geraldim é mineiro de Sabará, 28 anos: fala baixinho e devagar, com a boca meio cheia de pão de queijo, comendo sílabas ("Nu meu fi" sai quase "numêfi"), "uai" e "sô" bem mineiros, frase que sobe no fim. Está desconfiado e meio assustado, mas calmo.
Rai é baiano de Salvador, 25 anos: voz alegre e solta, vogais abertas, ritmo cantado, "Oxe" esticado, "véi" arrastado. Primeiro pergunta "Que fumaça, véi?" sem dar muita bola; depois ri do medo do amigo, zoa ("É churrasco, Geraldim") e apressa a turma com "Arroche, arroche!" batendo palma.
As falas respondem uma à outra rápido, como conversa de verdade.
```
**Texto:**
```
Geraldim: Nu meu fi… cês viram aquela fumaça ali?
Rai: Que fumaça, véi?
Geraldim: Aquela ali, uai! Esse trem tá esquisito demais, sô.
Rai: Oxe, relaxe vu! É churrasco, Geraldim. O ônibus sai dez e quarenta… Arroche, arroche!
```

---

## Bloco C — Bento sozinho (puxando a turma)
**Modo:** Single-speaker · voz **Algenib**
**Style:**
```
Gaúcho de Bagé, 30 anos, chamando os amigos pra ir embora, animado e mandão, alto mas sem gritar, como chefe de excursão. Sotaque da fronteira natural, "moçada" bem aberto. Fala de rua, nada de locutor.
```
**Texto:**
```
Bora, moçada!
```

---

## Bloco D — Caio + Bento (a zoeira no final)
**Speaker 1:** `Caio` · voz **Fenrir** — **Speaker 2:** `Bento` · voz **Algenib**
**Style:**
```
Dois amigos num lugar escuro e esquisito, como áudio de celular, sem voz de locutor.
Caio, paulistano da Mooca, vem andando atrás e reclama baixinho, meio rindo de nervoso: "Mano… isso aqui não tem cara de rodoviária não, cuzão." O "cuzão" é zoeira de amigo, com intimidade, dito quase cochichando.
Bento, gaúcho de Bagé, está um pouco à frente, lá dentro do depósito, e escuta: responde alto, virando pra trás, rindo e mandão, com a voz ecoando um pouco: "Ouvi, hein! Vem logo, é ali!"
A resposta do Bento vem logo em seguida, quase em cima da fala do Caio.
```
**Texto:**
```
Caio: Mano… isso aqui não tem cara de rodoviária não, cuzão.
Bento: Ouvi, hein! Vem logo, é ali!
```

---

### Se quiser ainda mais natural
- **Risadas e respiros:** dá pra escrever `(risos)` ou `(suspira)` dentro do texto, ex.: `Rai: (risos) Oxe, relaxe vu!`. Se o modelo ler a palavra em voz alta, apague e descreva no Style ("o Rai fala rindo").
- **Fala por cima:** no vídeo eu posso sobrepor um pouquinho o fim de uma fala com o começo da outra, como acontece numa conversa real.
