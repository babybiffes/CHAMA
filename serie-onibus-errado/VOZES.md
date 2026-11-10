# 🎙️ ÔNIBUS ERRADO — Vozes e texto da narração (Google AI Studio)

Este arquivo tem:
1. **Como gerar as vozes no Google AI Studio**, passo a passo.
2. **Ficha de voz de cada personagem**: voz recomendada e o *Style instructions* pronto pra colar.
3. **Texto da narração de todos os 10 episódios**, separado por personagem e com a emoção de cada fala, pronto pra copiar e colar.

---

## 1. Como gerar no AI Studio

1. Entre em **aistudio.google.com**, abra **Generate speech** e escolha o modelo **Gemini TTS** (a versão *Pro* tem mais qualidade de atuação; a *Flash* é mais rápida).
2. Use o modo **Single-speaker** (uma voz por vez). Assim cada personagem mantém sempre a mesma voz.
3. Em **Voice**, escolha a voz da ficha do personagem.
4. Em **Style instructions**, cole o bloco *Style* do personagem. Esse texto vale pra série inteira, então não mude entre episódios.
5. Na caixa de texto, cole o bloco do personagem no episódio (seção 3). As falas já estão em ordem, numeradas com a posição na cena (#01, #02…).
6. Gere e baixe o WAV. No CapCut ou no Premiere, encaixe cada fala no tempo do roteiro pelo número.

**Dicas importantes**
- **As tags entre colchetes** (`[whispering]`, `[shouting]`, `[laughing]`, `[short pause]`…) são marcações de emoção que o Gemini TTS entende. Deixe em inglês: funcionam melhor assim. Se em algum teste o modelo **ler a tag em voz alta**, apague a tag e escreva a emoção no começo do Style ("Nesta fala, sussurre com medo").
- **Gere uma fala por vez** quando ela for muito emocional (morte falsa, plot twist). Você consegue regenerar só ela até ficar perfeita.
- **Números por extenso** ("zero onze", "três por cento") pra voz não ler errado. Os textos abaixo já estão assim.
- **Teste o bordão** de cada personagem antes de gerar o episódio inteiro (está na ficha).
- **Modo Multi-speaker** (2 vozes juntas) funciona pra diálogos rápidos de dois personagens. Nesse modo, os nomes no texto precisam ser exatamente iguais aos nomes configurados nos speakers (ex.: `Caio:` e `Bento:`). Use só se o ping-pong da conversa ficar mais natural assim.
- **Velocidade:** as falas do Caio podem ser aceleradas 5–10% na edição, porque ele é o mais ansioso. As do Geraldim podem ser desaceleradas uns 5%.
- **Coreano:** as falas em hangul já estão prontas. O Gemini lê coreano nativo, basta usar o Style da ficha do personagem coreano.

> Os nomes das vozes (Fenrir, Puck…) são as vozes prontas do Gemini TTS. Se algum nome não aparecer na sua lista, escolha pela descrição entre parênteses, que é como o AI Studio descreve cada voz.

---

## 2. Fichas de voz

### 📱 CAIO — o Paulista (protagonista / POV)
- **Voz:** **Fenrir** *(Excitable)*. Alternativas: Puck *(Upbeat)*, Achird *(Friendly)*.
- **Legenda:** branco.
- **Style instructions:**
```
Você é Caio, 27 anos, paulistano da Mooca, São Paulo. Fale português brasileiro com sotaque paulistano bem marcado e exagerado para comédia: ritmo rápido, ansioso, emendando as palavras, com a melodia "cantada" italiana da Mooca ("Ôrra, meu!"), vogais nasais fortes e o "e" final aberto e arrastado em "meu" e "mano". Ele é o narrador em primeira pessoa da história, então a voz soa próxima, como se estivesse dentro da cabeça do ouvinte. Personalidade: líder ansioso, fala como quem está sempre atrasado para uma reunião, usa gírias paulistanas o tempo todo. Quando está com medo, fala baixinho e rápido, com a respiração curta. Quando está feliz, fala alto e empolgado.
```
- **Teste:** `Ôrra, meu… que treta é essa, mano?!`

### 🧉 BENTO — o Gaúcho
- **Voz:** **Algenib** *(Gravelly)*. Alternativas: Alnilam *(Firm)*, Orus *(Firm)*.
- **Legenda:** verde-claro.
- **Style instructions:**
```
Você é Bento, 30 anos, gaúcho de Bagé, no interior do Rio Grande do Sul. Fale português brasileiro com sotaque gaúcho da fronteira bem forte e exagerado para comédia: voz grave, rouca e encorpada, fala firme e orgulhosa, com a entonação "cantada" que sobe no meio e cai no fim da frase, levemente castelhanada. Usa "tu" com o verbo na terceira pessoa ("tu vai", "tu viu"). As palavras "Bah" e "tchê" saem bem marcadas e com peso: "Bah" é longo e grave, quase um suspiro indignado. Personalidade: corajoso, mandão, dramático e orgulhoso, mas com o coração mole: quando se emociona, a voz grossa treme e ele tenta disfarçar.
```
- **Teste:** `Bah. Mas que barbaridade, tchê!`

### 🧀 GERALDIM — o Mineiro
- **Voz:** **Umbriel** *(Easy-going)*. Alternativas: Achird *(Friendly)*, Schedar *(Even)*.
- **Legenda:** amarelo.
- **Style instructions:**
```
Você é Geraldim, 28 anos, mineiro de Sabará, Minas Gerais. Fale português brasileiro com sotaque mineiro do interior bem forte e exagerado para comédia: voz mansa, baixa e tranquila, comendo sílabas e emendando as palavras ("cê", "ocê", "dendicasa", "num"), com a entonação mineira que sobe no fim da frase, como uma pergunta. "Uai" e "sô" saem curtos e naturais, e o "Nó" é seco e surpreso. Fala devagar e calmo mesmo quando tudo está pegando fogo, como se nada fosse urgente. Às vezes fala com a boca meio cheia, mastigando pão de queijo. Personalidade: desconfiado, sábio sem querer, humilde e carinhoso.
```
- **Teste:** `Uai, sô… isso aí tem trem.`

### 🌴 RAI — o Baiano
- **Voz:** **Puck** *(Upbeat)*. Alternativas: Sadachbia *(Lively)*, Zubenelgenubi *(Casual)*.
- **Legenda:** laranja.
- **Style instructions:**
```
Você é Rai, 25 anos, baiano de Itapuã, Salvador. Fale português brasileiro com sotaque soteropolitano bem forte e exagerado para comédia: fala cantada e cheia de malemolência, vogais abertas e alongadas, ritmo que acelera e freia como uma música. "Oxe" é bem esticado e indignado, "véi" sai arrastado no fim das frases, e "Lá ele!" é gritado com fé, como quem espanta mau-olhado. Personalidade: o mais engraçado do grupo, otimista, festeiro e supersticioso, sempre rindo, até com medo. Quando está nervoso, fala rápido e ri de nervoso. Nos momentos sérios (a fitinha do Bonfim), fala baixo, devagar e misterioso.
```
- **Teste:** `Oxe, véi… isso aqui é barril dobrado! Lá ele!`

### 🕶️ LUIS — o Carioca (só no Ep. 10; também faz o guarda do "mermão" no Ep. 7 e o motorista)
- **Voz:** **Algieba** *(Smooth)*. Alternativa: Zubenelgenubi *(Casual)*.
- **Legenda:** azul.
- **Style instructions:**
```
Você é Luis, 29 anos, carioca do Méier, Rio de Janeiro. Fale português brasileiro com sotaque carioca bem marcado: "s" chiado ("mermão", "rapaziada", "vocêsh"), ritmo malandro e relaxado, frases que terminam arrastadas. Ele é o vilão revelado no final: voz calma, controlada e fria, com mágoa guardada há seis anos e uma ironia leve, como quem planejou tudo e está se divertindo. No fim, a frieza quebra e aparece a emoção de um amigo que foi esquecido.
```
- **Teste:** `Coé, rapaziada… demoraram, hein, mermão.`

### 🇰🇷 Personagens coreanos
Só falam coreano. Gere com o texto em hangul exatamente como está.

| Personagem | Voz | Style instructions |
|---|---|---|
| **Alto-falante** | **Kore** *(Firm)* | `Locutora coreana de sistema de alto-falante. Fale coreano nativo de Seul, voz feminina formal, fria, educada e robótica, como um anúncio de aeroporto. Leve eco de alto-falante.` |
| **Guarda** | **Alnilam** *(Firm)* | `Guarda coreano mascarado. Fale coreano nativo de Seul, voz masculina grave, seca, curta e sem nenhuma emoção, como uma ordem militar.` |
| **Boneca gigante** | **Leda** *(Youthful)* | `Boneca gigante cantando uma cantiga infantil coreana. Voz de criança doce, lenta e melodiosa, mas sinistra e arrastada no final, como uma caixinha de música assustadora. Coreano nativo.` |
| **Sra. Park (199)** | **Gacrux** *(Mature)* | `Senhora coreana de 70 anos, voz doce, carinhosa e um pouco trêmula de avó. Fala coreano nativo, curiosa e encantada com comida.` |
| **Min-jun (240)** | **Sadachbia** *(Lively)* | `Jovem coreano de 20 anos, animado e escandaloso, fala coreano nativo com muita energia e exclamação.` |
| **Líder mascarado** | **Algieba** *(Smooth)*, a mesma voz do Luis | `Fale coreano com voz grave, lenta e ameaçadora, levemente distorcida, como um chefe de jogo mortal. Pronúncia coreana correta, mas com um leve sotaque brasileiro escondido.` |

> Pista para os atentos: o Líder usa a **mesma voz do Luis**. Quem prestar atenção vai desconfiar antes do final.

### 📢 Locutor da enquete (opcional)
- **Voz:** **Charon** *(Informative)*.
- **Style:** `Narrador brasileiro de trailer de terror, voz grave, lenta e misteriosa, mas com um sorriso no fim, como quem provoca o público.`
- **Texto (final de todo episódio):** `E agora… o que VOCÊ faria? Comenta aqui embaixo.`
- **Texto (começo de todo episódio):** `Vocês escolheram…` (e o resto você mostra na tela)

---

## 3. Texto da narração por episódio

Cada bloco = **1 personagem em 1 episódio**. Cole o bloco inteiro no AI Studio com a voz e o Style da ficha. O número `#` é a ordem da fala na cena (use pra montar a edição). Se quiser gerar uma fala por vez, copie só a linha, sem o `#`.


### PARTE 01 — "PLATAFORMA 6"

**CAIO** · voz Fenrir
```
#01 [annoyed] Ôrra, meu… o Luis de novo? Mano, faz seis anos.
#05 [distracted] Plataforma… seis. Firmeza. É ali, mano.
#06 [shouting, excited] MANO. TOMADA!
#08 [extremely fast] Até o aeroporto, meu! O link falou! Foi alguém do grupo que mandou.
#10 [uhm] [short pause] …Sei lá, mano. Número desconhecido.
#15 [sleepy, fading] Vou só… carregar… o celul…
#17 [whispering, shocked] [long pause] …Mano. Isso não é Portugal.
```

**RAI** · voz Puck
```
#02 [laughing] Oxe, bloqueia esse homem, véi. Ele ficou em Registro, deixa ele lá.
#09 [curious] Quem do grupo?
#11 [whispering, scared] Ó paí ó… ninguém aqui pisca, véi.
#13 [whispering, mysterious] Fiz três pedidos no Bonfim antes de vir. Não conto senão não vale.
```

**GERALDIM** · voz Umbriel
```
#03 [calm, chewing] Uai, mas ês num deixou ele, ês esqueceu. É diferente.
#07 [curious] Uai… Europa vai de ônibus, é?
#14 [sleepy, slow] Nó… que cheirim bão de… algodão-doce…
```

**BENTO** · voz Algenib
```
#04 [excited, proud] Bah, foco, tchê! Plataforma nove. EUROPA. Seis anos juntando pila!
#12 [relaxed] É gringo, guri. Gringo é assim, quietinho.
```

**ALTO-FALANTE** · voz Kore
```
#16 [firm, loud] 일어나세요!
```

<details><summary>Ordem completa da cena (pra edição)</summary>

01. **CAIO:** Ôrra, meu… o Luis de novo? Mano, faz seis anos.  
02. **RAI:** Oxe, bloqueia esse homem, véi. Ele ficou em Registro, deixa ele lá.  
03. **GERALDIM:** Uai, mas ês num deixou ele, ês esqueceu. É diferente.  
04. **BENTO:** Bah, foco, tchê! Plataforma nove. EUROPA. Seis anos juntando pila!  
05. **CAIO:** Plataforma… seis. Firmeza. É ali, mano.  
06. **CAIO:** MANO. TOMADA!  
07. **GERALDIM:** Uai… Europa vai de ônibus, é?  
08. **CAIO:** Até o aeroporto, meu! O link falou! Foi alguém do grupo que mandou.  
09. **RAI:** Quem do grupo?  
10. **CAIO:** …Sei lá, mano. Número desconhecido.  
11. **RAI:** Ó paí ó… ninguém aqui pisca, véi.  
12. **BENTO:** É gringo, guri. Gringo é assim, quietinho.  
13. **RAI:** Fiz três pedidos no Bonfim antes de vir. Não conto senão não vale.  
14. **GERALDIM:** Nó… que cheirim bão de… algodão-doce…  
15. **CAIO:** Vou só… carregar… o celul…  
16. **ALTO-FALANTE:** 일어나세요!  
17. **CAIO:** …Mano. Isso não é Portugal.  

</details>

---

### PARTE 02 — "TERMO DE USO"

**BENTO** · voz Algenib
```
#01 [outraged] Bah… me tiraram a bombacha, tchê. Isso é crime.
#06 [serious, low] Alguém sabia quem a gente era, tchê.
#14 [proud, defiant] Capaz que eu assino isso!
#15 [scared, fast] …Bah, onde é que eu assino, tchê?
```

**RAI** · voz Puck
```
#02 [laughing] E meu chinelo ficou, véi! Olha só, Deus é baiano.
#05 [scared] Zero sete um, Salvador… Oxe. Isso aqui é BARRIL.
#10 [shouting, laughing] MASSA! Ela falou massa! A véia é baiana, gente!
```

**GERALDIM** · voz Umbriel
```
#03 [curious, slow] Ocês repararam nos número? Zero três um… é o DDD de Sabará.
#08 [kind] Uai… ela quer, né? Pega, vó.
#13 [annoyed] [short pause] [confused] Pó pará. Eu leio até bula, sô. …tá tudo em coreano.
```

**CAIO** · voz Fenrir
```
#04 [whispering] Zero onze… São Paulo. Mano.
#12 [extremely fast, confident] Relaxa, mano. É termo de uso. Ninguém lê termo de uso. Assina e pronto.
#16 [amazed, whispering] Ôrra, meu… Isso aí é… dá pra ir pra Europa umas mil vezes.
#17 [scared, whispering] [medium pause] …Gente. Como o Luis sabe que a gente não tá bem?
```

**SRA. PARK** · voz Gacrux
```
#07 [gentle, curious] 이거 먹어도 돼요?
#09 [delighted] 맛있다!!
```

**GUARDA** · voz Alnilam
```
#11 [cold, firm] 서명하세요.
```

<details><summary>Ordem completa da cena (pra edição)</summary>

01. **BENTO:** Bah… me tiraram a bombacha, tchê. Isso é crime.  
02. **RAI:** E meu chinelo ficou, véi! Olha só, Deus é baiano.  
03. **GERALDIM:** Ocês repararam nos número? Zero três um… é o DDD de Sabará.  
04. **CAIO:** Zero onze… São Paulo. Mano.  
05. **RAI:** Zero sete um, Salvador… Oxe. Isso aqui é BARRIL.  
06. **BENTO:** Alguém sabia quem a gente era, tchê.  
07. **SRA. PARK:** 이거 먹어도 돼요?  
08. **GERALDIM:** Uai… ela quer, né? Pega, vó.  
09. **SRA. PARK:** 맛있다!!  
10. **RAI:** MASSA! Ela falou massa! A véia é baiana, gente!  
11. **GUARDA:** 서명하세요.  
12. **CAIO:** Relaxa, mano. É termo de uso. Ninguém lê termo de uso. Assina e pronto.  
13. **GERALDIM:** Pó pará. Eu leio até bula, sô. …tá tudo em coreano.  
14. **BENTO:** Capaz que eu assino isso!  
15. **BENTO:** …Bah, onde é que eu assino, tchê?  
16. **CAIO:** Ôrra, meu… Isso aí é… dá pra ir pra Europa umas mil vezes.  
17. **CAIO:** …Gente. Como o Luis sabe que a gente não tá bem?  

</details>

---

### PARTE 03 — "BATATINHA FRITA"

**RAI** · voz Puck
```
#01 [sweet, relaxed] Oxe… que bonequinha bonitinha, véi.
#06 [whispering, extremely fast, praying] Lá ele… lá ele… lá ele…
#07 [shouting, desperate] MEU CHINELO, VÉI!
```

**GERALDIM** · voz Umbriel
```
#02 [suspicious] Uai… boneca grande desse tamanho num tem como ser coisa boa, não.
#04 [confused, whispering] Nó… ela falou cocô?
```

**BONECA** · voz Leda
```
#03 [childlike, slow, creepy singsong] 무궁화 꽃이 피었습니다…
```

**CAIO** · voz Fenrir
```
#05 [whispering, terrified] Mano… é batatinha frita um, dois, três… com tiro.
#08 [whispering, tense] Aguenta, Rai… aguenta, mano…
#10 [crying, voice breaking] [short pause] [shouting] Bento…? BENTO!
```

**BENTO** · voz Algenib
```
#09 [whispering, resigned] …Bah.
```

<details><summary>Ordem completa da cena (pra edição)</summary>

01. **RAI:** Oxe… que bonequinha bonitinha, véi.  
02. **GERALDIM:** Uai… boneca grande desse tamanho num tem como ser coisa boa, não.  
03. **BONECA:** 무궁화 꽃이 피었습니다…  
04. **GERALDIM:** Nó… ela falou cocô?  
05. **CAIO:** Mano… é batatinha frita um, dois, três… com tiro.  
06. **RAI:** Lá ele… lá ele… lá ele…  
07. **RAI:** MEU CHINELO, VÉI!  
08. **CAIO:** Aguenta, Rai… aguenta, mano…  
09. **BENTO:** …Bah.  
10. **CAIO:** Bento…? BENTO!  

</details>

---

### PARTE 04 — "FURARAM MINHA TÉRMICA"

**CAIO** · voz Fenrir
```
#01 [sad, voice breaking] Mano… a gente nem tirou foto na Torre Eiffel com ele.
#10 [shouting, panicked, extremely fast] Quem é Pali?! Tem DOIS Pali?!
```

**GERALDIM** · voz Umbriel
```
#02 [crying softly, chewing] Ele me ensinou a tomar chimarrão… eu queimei a língua… e mesmo assim falei que era bão. Porque era dele.
#11 [urgent but calm] Uai, montem as cama! Barricada, sô!
```

**RAI** · voz Puck
```
#03 [sad, nostalgic] Ele dizia tri pra tudo, véi. Até pra coisa ruim.
#07 [shouting, laughing, relieved] LÁ ELE! Tu morreu, véi, tu MORREU!
```

**BENTO** · voz Algenib
```
#04 [shouting, outraged] BAH! Furaram minha térmica, tchê!
#06 [outraged, dramatic] A bala pegou bem na térmica! Desmaiei foi de desgosto! Essa térmica era do meu avô!
#08 [proud, cocky] Capaz! Gaúcho não morre, gaúcho tira um cochilo.
```

**MIN-JUN** · voz Sadachbia
```
#09 [shouting, urgent] 빨리빨리!
```

**TODOS** (gere a fala com as 4 vozes, cada uma separada, e sobreponha na edição)
```
#05 [shouting, shocked] BENTO?!
```

<details><summary>Ordem completa da cena (pra edição)</summary>

01. **CAIO:** Mano… a gente nem tirou foto na Torre Eiffel com ele.  
02. **GERALDIM:** Ele me ensinou a tomar chimarrão… eu queimei a língua… e mesmo assim falei que era bão. Porque era dele.  
03. **RAI:** Ele dizia tri pra tudo, véi. Até pra coisa ruim.  
04. **BENTO:** BAH! Furaram minha térmica, tchê!  
05. **TODOS:** BENTO?!  
06. **BENTO:** A bala pegou bem na térmica! Desmaiei foi de desgosto! Essa térmica era do meu avô!  
07. **RAI:** LÁ ELE! Tu morreu, véi, tu MORREU!  
08. **BENTO:** Capaz! Gaúcho não morre, gaúcho tira um cochilo.  
09. **MIN-JUN:** 빨리빨리!  
10. **CAIO:** Quem é Pali?! Tem DOIS Pali?!  
11. **GERALDIM:** Uai, montem as cama! Barricada, sô!  

</details>

---

### PARTE 05 — "O DOCE"

**CAIO** · voz Fenrir
```
#01 [frustrated] Mano, eu peguei o guarda-chuva. É o mais embaçado. ZICA.
#05 [suspicious, whispering] Mano… isso é muito específico.
```

**GERALDIM** · voz Umbriel
```
#02 [calm, licking] Uai… o meu é estrela. Se lamber, derrete. Ninguém me ensinou, mas eu sei.
#06 [suspicious, low] Isso aí tem trem.
#11 [shouting, panicked] Tá lá? TÁ LÁ ONDE, SÔ?!
```

**BENTO** · voz Algenib
```
#03 [confident] Bah, deixa comigo. Derrete esse troço, tchê!
#12 [whispering, devastated] …Rai…
```

**RAI** · voz Puck
```
#04 [confused, scared] Oxe… quem é que bota Cristo Redentor num doce coreano, véi?
#08 [nervous laugh, extremely fast] …Gente. Ele perdeu um braço. É só um braço. O Cristo nem usa o braço, ele só fica assim parado…
#09 [scared, voice trembling, fake smile] Ei… ei, pai… relaxe… a gente pode conversar, né? É só um braço…
```

**MIN-JUN** · voz Sadachbia
```
#07 [amazed, excited] 대박!
```

**GUARDA** · voz Alnilam
```
#10 [cold, flat] 탈락.
```

<details><summary>Ordem completa da cena (pra edição)</summary>

01. **CAIO:** Mano, eu peguei o guarda-chuva. É o mais embaçado. ZICA.  
02. **GERALDIM:** Uai… o meu é estrela. Se lamber, derrete. Ninguém me ensinou, mas eu sei.  
03. **BENTO:** Bah, deixa comigo. Derrete esse troço, tchê!  
04. **RAI:** Oxe… quem é que bota Cristo Redentor num doce coreano, véi?  
05. **CAIO:** Mano… isso é muito específico.  
06. **GERALDIM:** Isso aí tem trem.  
07. **MIN-JUN:** 대박!  
08. **RAI:** …Gente. Ele perdeu um braço. É só um braço. O Cristo nem usa o braço, ele só fica assim parado…  
09. **RAI:** Ei… ei, pai… relaxe… a gente pode conversar, né? É só um braço…  
10. **GUARDA:** 탈락.  
11. **GERALDIM:** Tá lá? TÁ LÁ ONDE, SÔ?!  
12. **BENTO:** …Rai…  

</details>

---

### PARTE 06 — "LÁ ELE"

**CAIO** · voz Fenrir
```
#01 [crying softly] Mano, ele era o único que ria das minhas piadas de LinkedIn…
#10 [whispering, realizing] …Mano. A gente nunca chegou na Europa.
```

**BENTO** · voz Algenib
```
#02 [sniffing, trying to hide crying] É o vento, tchê. É o vento.
#07 [shouting, emotional] Tu tava MORTO, guri!
#13 [curious] E o terceiro pedido?
```

**GERALDIM** · voz Umbriel
```
#03 [flat, deadpan] Num tem vento aqui dentro não, sô.
#05 [shouting, shocked] NÓ, SÔ!
#11 [curious, slow] Uai… então nós num morre? Nós tá… fechado?
```

**RAI** · voz Puck
```
#04 [shouting, ecstatic, long and loud] LÁÁÁ ELEEEEE!!!
#06 [laughing, casual] Oxe, gente, que cara é essa? Eu só desmaiei, véi! A bala pegou de raspão!
#08 [serious, low] [short pause] …Gente. Vem cá. Eu tenho que contar uma coisa.
#09 [whispering, mysterious] No Bonfim eu fiz três pedidos. O primeiro: que a gente nunca se separasse. O segundo… que nenhum de nós morresse antes de conhecer a Europa.
#12 [nervous laugh] É barril, mas… acho que sim.
#14 [nervous, evasive] O terceiro não conto. Esse eu não posso contar de jeito nenhum.
```

<details><summary>Ordem completa da cena (pra edição)</summary>

01. **CAIO:** Mano, ele era o único que ria das minhas piadas de LinkedIn…  
02. **BENTO:** É o vento, tchê. É o vento.  
03. **GERALDIM:** Num tem vento aqui dentro não, sô.  
04. **RAI:** LÁÁÁ ELEEEEE!!!  
05. **GERALDIM:** NÓ, SÔ!  
06. **RAI:** Oxe, gente, que cara é essa? Eu só desmaiei, véi! A bala pegou de raspão!  
07. **BENTO:** Tu tava MORTO, guri!  
08. **RAI:** …Gente. Vem cá. Eu tenho que contar uma coisa.  
09. **RAI:** No Bonfim eu fiz três pedidos. O primeiro: que a gente nunca se separasse. O segundo… que nenhum de nós morresse antes de conhecer a Europa.  
10. **CAIO:** …Mano. A gente nunca chegou na Europa.  
11. **GERALDIM:** Uai… então nós num morre? Nós tá… fechado?  
12. **RAI:** É barril, mas… acho que sim.  
13. **BENTO:** E o terceiro pedido?  
14. **RAI:** O terceiro não conto. Esse eu não posso contar de jeito nenhum.  

</details>

---

### PARTE 07 — "CABO DE GUERRA"

**CAIO** · voz Fenrir
```
#01 [nervous, sarcastic] Mano… são dez. A gente é quatro. Isso nem é jogo, é goleada.
#07 [dismissive] Viajou, mano. É coreano, deve ser obrigado sei lá.
#09 [shouting, effort, hopeful] VAI DAR, MANO! VAI DAR!
#11 [whispering, scared] [long pause] …Geraldim?
```

**BENTO** · voz Algenib
```
#02 [confident, commanding] Bah, no Sul a gente puxa boi atolado, tchê. Escuta: pé na frente, corpo pra trás, e ninguém solta.
#08 [shouting, effort] AGORA, TCHÊ! TODO MUNDO PRA TRÁS!
```

**GERALDIM** · voz Umbriel
```
#03 [worried] E se a gente cair?
```

**RAI** · voz Puck
```
#04 [relaxed, joking] Ó, eu não posso morrer, já testei.
#06 [shouting, shocked] OXE! Ele falou MERMÃO?!
```

**GUARDA (LUIS DISFARÇADO)** · voz Algieba
```
#05 [muttering, annoyed, in Brazilian Portuguese carioca accent] …mermão.
```

**TODOS** (gere a fala com as 4 vozes, cada uma separada, e sobreponha na edição)
```
#10 [shouting, desperate] GERALDIM, NÃÃÃO!
```

<details><summary>Ordem completa da cena (pra edição)</summary>

01. **CAIO:** Mano… são dez. A gente é quatro. Isso nem é jogo, é goleada.  
02. **BENTO:** Bah, no Sul a gente puxa boi atolado, tchê. Escuta: pé na frente, corpo pra trás, e ninguém solta.  
03. **GERALDIM:** E se a gente cair?  
04. **RAI:** Ó, eu não posso morrer, já testei.  
05. **GUARDA (LUIS DISFARÇADO):** …mermão.  
06. **RAI:** OXE! Ele falou MERMÃO?!  
07. **CAIO:** Viajou, mano. É coreano, deve ser obrigado sei lá.  
08. **BENTO:** AGORA, TCHÊ! TODO MUNDO PRA TRÁS!  
09. **CAIO:** VAI DAR, MANO! VAI DAR!  
10. **TODOS:** GERALDIM, NÃÃÃO!  
11. **CAIO:** …Geraldim?  

</details>

---

### PARTE 08 — "BOLINHA DE GUDE"

**GERALDIM** · voz Umbriel
```
#01 [calm, relieved, chewing] Uai… a Vó Lurdinha costurou essa sacola reforçada pra durar a vida inteira. Durou, sô.
#06 [warm, simple] Faz o que a gente sempre faz, uai. Resenha.
#07 [warm, emotional] É o último. Vó Lurdinha falou: o último pão de queijo a gente divide com quem é família.
#11 [shouting, crying] CAIO, NÃO, SÔ!
```

**CAIO** · voz Fenrir
```
#02 [shouting, effort] MANO! Segura minha mão!
#03 [firm, emotional] Mano… não. Não. Eu não vou jogar contra vocês.
#08 [guilty, voice breaking] Gente… fui eu que cliquei no link. Fui eu que vi a plataforma errada. Tudo isso é culpa minha, mano.
#10 [shouting, desperate, fast] Não, não, não. Eu. Eu perdi. Fui eu, mano.
#12 [soft, smiling through tears] Fala pra minha mãe que o Wi-Fi do ônibus era bom.
```

**BENTO** · voz Algenib
```
#04 [firm, emotional] Capaz. Eu não jogo contra irmão.
```

**RAI** · voz Puck
```
#05 [sad] E aí? A gente faz o quê?
#09 [affectionate, scolding] Oxe, abestado, para com isso.
```

<details><summary>Ordem completa da cena (pra edição)</summary>

01. **GERALDIM:** Uai… a Vó Lurdinha costurou essa sacola reforçada pra durar a vida inteira. Durou, sô.  
02. **CAIO:** MANO! Segura minha mão!  
03. **CAIO:** Mano… não. Não. Eu não vou jogar contra vocês.  
04. **BENTO:** Capaz. Eu não jogo contra irmão.  
05. **RAI:** E aí? A gente faz o quê?  
06. **GERALDIM:** Faz o que a gente sempre faz, uai. Resenha.  
07. **GERALDIM:** É o último. Vó Lurdinha falou: o último pão de queijo a gente divide com quem é família.  
08. **CAIO:** Gente… fui eu que cliquei no link. Fui eu que vi a plataforma errada. Tudo isso é culpa minha, mano.  
09. **RAI:** Oxe, abestado, para com isso.  
10. **CAIO:** Não, não, não. Eu. Eu perdi. Fui eu, mano.  
11. **GERALDIM:** CAIO, NÃO, SÔ!  
12. **CAIO:** Fala pra minha mãe que o Wi-Fi do ônibus era bom.  

</details>

---

### PARTE 09 — "PONTE DE VIDRO"

**CAIO** · voz Fenrir
```
#01 [weak, coughing] [short pause] …Mano. A bateria… morreu no meu lugar.
#03 [proud, weak laugh] Três por cento de bateria e cem por cento de lealdade, mano.
#06 [amazed] Mano… o Geraldim tá carregando a gente.
#12 [whispering, chilling realization] Mano… quem tá por trás disso aqui… é brasileiro.
```

**RAI** · voz Puck
```
#02 [shouting, laughing, relieved] LÁ ELE! O CELULAR DE TRÊS POR CENTO SALVOU O HOMEM!
#09 [extremely fast, panicked] Bento, não respira, não fala, não toma chimarrão!
#11 [confused] Oxe… isso é brincadeira de escola NO BRASIL, véi.
```

**BENTO** · voz Algenib
```
#04 [nervous] Bah… uma placa aguenta, a outra quebra. É sorte, tchê.
#08 [whispering, terrified] …Bah.
#10 [crying, emotional] Ela salvou minha vida duas vezes, tchê.
```

**GERALDIM** · voz Umbriel
```
#05 [calm, wise] Sorte nada, sô. Meu tio é vidraceiro em Sabará. Vidro temperado faz tóc. Vidro comum faz tlin.
#07 [calm, slightly proud] Desde sempre, sô. Só cês num percebia.
```

<details><summary>Ordem completa da cena (pra edição)</summary>

01. **CAIO:** …Mano. A bateria… morreu no meu lugar.  
02. **RAI:** LÁ ELE! O CELULAR DE TRÊS POR CENTO SALVOU O HOMEM!  
03. **CAIO:** Três por cento de bateria e cem por cento de lealdade, mano.  
04. **BENTO:** Bah… uma placa aguenta, a outra quebra. É sorte, tchê.  
05. **GERALDIM:** Sorte nada, sô. Meu tio é vidraceiro em Sabará. Vidro temperado faz tóc. Vidro comum faz tlin.  
06. **CAIO:** Mano… o Geraldim tá carregando a gente.  
07. **GERALDIM:** Desde sempre, sô. Só cês num percebia.  
08. **BENTO:** …Bah.  
09. **RAI:** Bento, não respira, não fala, não toma chimarrão!  
10. **BENTO:** Ela salvou minha vida duas vezes, tchê.  
11. **RAI:** Oxe… isso é brincadeira de escola NO BRASIL, véi.  
12. **CAIO:** Mano… quem tá por trás disso aqui… é brasileiro.  

</details>

---

### PARTE 10 — "FINAL — ROUND 7"

**CAIO** · voz Fenrir
```
#01 [focused, fast] Plano, mano: o Bento segura, o Geraldim passa despercebido, o Rai distrai.
#10 [shouting, angry] Mano… cê quase matou a gente!
#15 [shouting, ecstatic] MANO! PARIS! FOI SONHO, MEU!
#19 [laughing, carefree] E daí, mano?
```

**RAI** · voz Puck
```
#02 [confident, playful] Distrair é comigo, véi.
#13 [ashamed, voice breaking] …A gente nunca foi te buscar, véi. Eu pensava nisso todo dia.
#18 [whispering, scared] …Gente. A fitinha caiu.
#20 [slow, serious, chilling] Quando a fitinha cai sozinha… é porque os três pedidos foram atendidos. A gente nunca se separou. O Luis voltou. E a gente… chegou na Europa.
```

**GERALDIM** · voz Umbriel
```
#03 [calm, surprised] Uai… peguei.
#08 [confused, innocent] Uai… ocê tá diferente. Cê tá coreano?
#17 [happy, relaxed] Nó… bão demais, sô.
#21 [whispering, terrified] …Então agora… nós pode morrer, sô.
```

**LÍDER** · voz Algieba
```
#04 [deep, slow, menacing] 축하합니다.
```

**LUIS** · voz Algieba
```
#05 [casual, cool, slow] …Coé, rapaziada.
#07 [bitter, slow, each word separate] Registro. Posto de gasolina. Dois mil e dezenove. Parada de quinze minutos.
#09 [sarcastic, cool] Seis anos, mermão. Seis anos aprendendo coreano pra organizar isso aqui. O link da passagem? Fui eu. A placa da plataforma? Eu soltei o parafuso.
#11 [calm, knowing] Quase. Mas vocês não podiam morrer. Né, Rai?
#12 [softer, slow] O terceiro pedido. Eu tava lá no Bonfim, sentado atrás de você. Senhor do Bonfim… traz o Luis de volta.
#14 [emotional, warm, then hypnotic] Eu sei. Por isso eu vim buscar vocês. Agora… durmam. A Europa tá esperando.
```

**BENTO** · voz Algenib
```
#16 [shouting, happy] BAH, TCHÊ!
#23 [whispering, terrified] …Bah.
```

**MOTORISTA (LUIS)** · voz Algieba
```
#22 [slow, menacing, French] Bienvenue.
```

**TODOS** (gere a fala com as 4 vozes, cada uma separada, e sobreponha na edição)
```
#06 [shouting, shocked] LUIS?!
```

<details><summary>Ordem completa da cena (pra edição)</summary>

01. **CAIO:** Plano, mano: o Bento segura, o Geraldim passa despercebido, o Rai distrai.  
02. **RAI:** Distrair é comigo, véi.  
03. **GERALDIM:** Uai… peguei.  
04. **LÍDER:** 축하합니다.  
05. **LUIS:** …Coé, rapaziada.  
06. **TODOS:** LUIS?!  
07. **LUIS:** Registro. Posto de gasolina. Dois mil e dezenove. Parada de quinze minutos.  
08. **GERALDIM:** Uai… ocê tá diferente. Cê tá coreano?  
09. **LUIS:** Seis anos, mermão. Seis anos aprendendo coreano pra organizar isso aqui. O link da passagem? Fui eu. A placa da plataforma? Eu soltei o parafuso.  
10. **CAIO:** Mano… cê quase matou a gente!  
11. **LUIS:** Quase. Mas vocês não podiam morrer. Né, Rai?  
12. **LUIS:** O terceiro pedido. Eu tava lá no Bonfim, sentado atrás de você. Senhor do Bonfim… traz o Luis de volta.  
13. **RAI:** …A gente nunca foi te buscar, véi. Eu pensava nisso todo dia.  
14. **LUIS:** Eu sei. Por isso eu vim buscar vocês. Agora… durmam. A Europa tá esperando.  
15. **CAIO:** MANO! PARIS! FOI SONHO, MEU!  
16. **BENTO:** BAH, TCHÊ!  
17. **GERALDIM:** Nó… bão demais, sô.  
18. **RAI:** …Gente. A fitinha caiu.  
19. **CAIO:** E daí, mano?  
20. **RAI:** Quando a fitinha cai sozinha… é porque os três pedidos foram atendidos. A gente nunca se separou. O Luis voltou. E a gente… chegou na Europa.  
21. **GERALDIM:** …Então agora… nós pode morrer, sô.  
22. **MOTORISTA (LUIS):** Bienvenue.  
23. **BENTO:** …Bah.  

</details>

---
