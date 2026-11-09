'use strict';
/* Lumevale — a história: abertura, o que muda no vale a cada Guardião, o Diário de Mestra Candeia, o final
   e o resumo da aba Ajuda. Português e inglês no mesmo arquivo (texto corrido, fora do dicionário). */
(function () {
  const LV = window.LV;
  const T = {
    pt: {
      abertura: [
        { fundo: 'raizes', txt: 'Em Lumevale, a luz não vem do céu. O <b>Lume</b> nasce no Coração, no fundo da terra, e sobe pelas raízes, pelas águas e pelos cristais. É ele que faz a mata crescer e os lampiões acenderem.' },
        { fundo: 'cinzas', txt: 'Há uma geração, o Lume parou de subir. Os rios ficaram mornos e cinzentos, as florestas secam por dentro e, das fendas, sobem os <b>Breus</b>: escuridão completa, sem nenhuma luz dentro. O povo chama isso de <b>Esmorecer</b>.' },
        { fundo: 'cristais', criaturas: { tipo: 'luz', imgs: ['pets/fagulho_0', 'pets/gotim_0', 'pets/esporito_0', 'pets/lumagua_0'] }, txt: 'Nem tudo lá embaixo é escuro. Do Lume nascem as <b>Centelhas</b>, criaturas com uma pequena chama acesa por dentro. Assustadas com o Esmorecer, muitas atacam quem chega perto. Mas, quando a chama de uma Centelha enfraquece, a lanterna de um domador vira abrigo: ela aceita entrar e passa a lutar ao seu lado.' },
        { fundo: 'ruinas', criaturas: { tipo: 'breu', imgs: ['inimigos/rastejante', 'inimigos/galho', 'inimigos/olho', 'inimigos/afogado'] }, txt: 'Um <b>Breu</b> é o contrário de uma Centelha. Ele nasce onde o Lume foi arrancado e não tem chama nenhuma, nada que a lanterna possa abrigar: só fome de luz. Por isso Breus não se domam. É preciso desfazê-los, e o Lume que eles engoliram se solta em gotas.' },
        { fundo: 'fungos', txt: '<b>Mestra Candeia</b>, a última grande domadora, desceu para curar o Coração. Nunca voltou. Em <b>Alvorada</b>, a última vila ainda acesa, o grande lampião começou a falhar.' },
        { fundo: 'raizes', heroi: true, txt: 'Você foi aprendiz de Candeia. Agora a lanterna é sua. Desça camada por camada, devolva a luz ao vale e descubra o que aconteceu com ela.' },
      ],
      continuar: 'Continuar', comecar: 'Começar a descida', pular: 'Pular',
      // o que muda quando cada Guardião cai pela primeira vez
      efeito: [
        'Lá em cima, as florestas param de secar. As raízes voltam a murmurar.',
        'Entre os restos do Rei Bolor, você encontra a velha lanterna de Mestra Candeia.',
        'A chuva eterna diminui. Lá em cima, os rios voltam a correr limpos.',
        'O canto da Matriarca volta a acalmar o Coração. O caminho até ele se abre.',
        'A febre do Coração cede. O Lume volta a subir.',
      ],
      paginas: [
        { t: 'As raízes', txt: [
          'A Mãe-Raiz não me reconheceu. Ela sempre deixou os domadores passarem, mas agora aperta as raízes como quem prende a respiração.',
          'Senti o Lume parado dentro dela, querendo subir sem conseguir. Se até ela está assim, o problema vem de mais fundo.',
          'Deixo esta página presa nas raízes. Se alguém de Alvorada vier atrás de mim: eu passei por aqui.'] },
        { t: 'A cripta', txt: [
          'Os primeiros domadores descansam aqui. O bolor cresce sobre a luz que eles deixaram, e o Rei Bolor se alimenta dela.',
          'Ele arrancou minha lanterna na luta e a pôs na cabeça, como uma coroa. Desci sem ela, só com as minhas Centelhas.',
          'Se você está lendo isto, a lanterna voltou para mãos de domador. Cuide dela.'] },
        { t: 'A capital', txt: [
          'A Sentinela não me deixa passar. Ela repete sempre a mesma ordem: ninguém desce às minas.',
          'Encontrei o selo dessa ordem numa praça afogada, com a data do dia em que a chuva começou.',
          'O Povo do Lume sabia o que tinha acontecido lá embaixo. E escolheu esconder.'] },
        { t: 'As minas', txt: [
          'Agora entendo. Os antigos cavaram atrás do Lume cristalizado, cada vez mais fundo, até a picareta bater na casca do Coração.',
          'A Matriarca canta para segurar a rachadura, mas a febre a enlouqueceu.',
          'O Coração não é um monstro. Está ferido, e queima a própria luz para não morrer.'] },
        { t: 'O Coração', txt: [
          'Cheguei ao fundo e não fui forte o bastante. A febre me consumiu.',
          'Mas a minha luz não se apagou: virou eco, subiu e encontrou um lugar para ficar. Talvez você já tenha ouvido a minha voz no Santuário.',
          'Se você venceu o Coração, eu não desci em vão. Obrigada, aprendiz. Agora o vale tem quem o guarde.'] },
      ],
      diario: 'Diário de Mestra Candeia', diarioCurto: 'Diário de Candeia', pagina: 'Página', ler: 'Ler',
      novaPagina: 'Nova página no Diário de Candeia', bloqueada: (g) => 'Vença ' + g + ' para encontrar esta página.',
      voltar: 'Voltar ao diário', fechar: 'Fechar',
      diarioSub: 'Páginas que Candeia deixou pelo caminho. Cada Guardião vencido revela uma.',
      final: {
        olho: 'Fim da primeira descida', titulo: 'O Lume volta a subir',
        txt: [
          'A febre do Coração cede. Uma coluna de luz sobe pelas cinzas, atravessa as minas, a cidade afogada, a cripta e as raízes, e chega ao alto do vale.',
          'Em Alvorada, o grande lampião volta a brilhar. Os rios clareiam, as florestas respiram e, pela primeira vez em uma geração, as janelas da vila se acendem sozinhas.',
        ],
        citacao: '“Agora o vale tem quem o guarde.”', autor: 'o eco de Mestra Candeia',
        lenda: 'Em Alvorada, já chamam você de <b>Lenda de Lumevale</b>.',
        gancho: 'Mas, no silêncio depois da febre, algo se mexe abaixo do Coração…',
        depois: 'A cicatriz do Coração nunca fecha de todo: os Guardiões ainda despertam de tempos em tempos. Continue caçando, renasça para ficar mais forte e mantenha a luz subindo.',
        botao: 'Continuar',
      },
      resumoT: 'A história',
      resumo: [
        '<b>Lumevale</b> é um vale onde a luz vem de baixo: o <b>Lume</b> nasce no Coração, no fundo da terra, e sobe como seiva. Os <b>Lumes</b> que você coleta são gotas dele, cristalizadas.',
        'No <b>Esmorecer</b>, o Lume parou de subir: os rios ficaram cinzentos, as florestas secam e surgiram os <b>Breus</b>, escuridão completa sem nenhuma luz dentro.',
        'Os <b>Domadores de Lume</b> cuidam da luz junto com as <b>Centelhas</b>, criaturas nascidas do Lume. A lanterna é um abrigo: com a luz fraca, a Centelha aceita entrar.',
        'Os <b>Breus</b> nascem onde o Lume foi arrancado e não têm chama nenhuma, nada que a lanterna possa abrigar: por isso não se domam. Desfeitos, soltam em gotas o Lume que engoliram.',
        'Cada camada tem um <b>Guardião</b> que, doente, prende a luz e fecha o caminho. Vencê-lo solta a luz, mas ele volta a despertar enquanto o vale não sarar.',
        'Toda luz que se apaga deixa um <b>eco</b>. Ao renascer, o que você aprendeu fica no Santuário dos Ecos.',
        'Você foi aprendiz de <b>Mestra Candeia</b>, que desceu para curar o Coração e nunca voltou. Desça, devolva a luz a <b>Alvorada</b> e descubra o que aconteceu com ela.',
      ],
      santuario: 'Toda luz que se apaga deixa um eco. Alguém guarda estes Ecos para você: uma voz que soa familiar. As melhorias do Santuário valem para todas as jornadas.',
      santuarioFinal: 'O eco de Mestra Candeia guarda este Santuário. Toda luz que se apaga deixa um eco, e as melhorias daqui valem para todas as jornadas.',
      tutorialSub: 'A clareira onde os aprendizes encontram sua primeira Centelha.',
    },
    en: {
      abertura: [
        { fundo: 'raizes', txt: 'In Lumevale, light does not come from the sky. The <b>Lume</b> is born in the Heart, deep under the earth, and rises through roots, waters and crystals. It makes the woods grow and the lamps glow.' },
        { fundo: 'cinzas', txt: 'A generation ago, the Lume stopped rising. The rivers turned warm and grey, the forests wither from within and, from the cracks, the <b>Murks</b> crawl up: total darkness with no light inside. People call it the <b>Fading</b>.' },
        { fundo: 'cristais', criaturas: { tipo: 'luz', imgs: ['pets/fagulho_0', 'pets/gotim_0', 'pets/esporito_0', 'pets/lumagua_0'] }, txt: 'Not everything down there is dark. From the Lume the <b>Glimmers</b> are born, creatures with a small flame lit inside. Frightened by the Fading, many attack anyone who comes near. But when a Glimmer’s flame grows weak, a tamer’s lantern becomes a shelter: it agrees to come in and fights at your side.' },
        { fundo: 'ruinas', criaturas: { tipo: 'breu', imgs: ['inimigos/rastejante', 'inimigos/galho', 'inimigos/olho', 'inimigos/afogado'] }, txt: 'A <b>Murk</b> is the opposite of a Glimmer. It forms where the Lume was torn away and has no flame at all, nothing the lantern can shelter: only hunger for light. That is why Murks cannot be tamed. They must be undone, and the Lume they swallowed breaks free in drops.' },
        { fundo: 'fungos', txt: '<b>Master Candeia</b>, the last great tamer, went down to heal the Heart. She never returned. In <b>Daybreak</b>, the last village still lit, the great lamp has begun to flicker.' },
        { fundo: 'raizes', heroi: true, txt: 'You were Candeia’s apprentice. Now the lantern is yours. Go down layer by layer, bring the light back to the valley and find out what happened to her.' },
      ],
      continuar: 'Continue', comecar: 'Begin the descent', pular: 'Skip',
      efeito: [
        'Up above, the forests stop withering. The roots start whispering again.',
        'Among the Mold King’s remains, you find Master Candeia’s old lantern.',
        'The endless rain eases. Up above, the rivers run clean again.',
        'The Matriarch’s song soothes the Heart once more. The way to it opens.',
        'The Heart’s fever breaks. The Lume rises again.',
      ],
      paginas: [
        { t: 'The roots', txt: [
          'The Root Mother did not recognize me. She always let tamers through, but now she clenches her roots like someone holding their breath.',
          'I felt the Lume stuck inside her, wanting to rise and unable to. If even she is like this, the trouble comes from deeper down.',
          'I leave this page caught in the roots. If anyone from Daybreak comes after me: I passed this way.'] },
        { t: 'The crypt', txt: [
          'The first tamers rest here. Mold grows over the light they left behind, and the Mold King feeds on it.',
          'He tore my lantern from me in the fight and wore it on his head like a crown. I went down without it, with only my Glimmers.',
          'If you are reading this, the lantern is back in a tamer’s hands. Take care of it.'] },
        { t: 'The capital', txt: [
          'The Sentinel will not let me pass. She keeps repeating the same order: no one goes down to the mines.',
          'I found the seal of that order in a drowned square, dated the day the rain began.',
          'The Lume Folk knew what had happened down there. And they chose to hide it.'] },
        { t: 'The mines', txt: [
          'Now I understand. The ancients dug after crystallized Lume, deeper and deeper, until the pickaxe struck the Heart’s shell.',
          'The Matriarch sings to hold the crack closed, but the fever has driven her mad.',
          'The Heart is not a monster. It is wounded, and it burns its own light so it won’t die.'] },
        { t: 'The Heart', txt: [
          'I reached the bottom and I was not strong enough. The fever consumed me.',
          'But my light did not go out: it became an echo, rose up and found a place to stay. Perhaps you have already heard my voice in the Sanctuary.',
          'If you have defeated the Heart, I did not go down in vain. Thank you, apprentice. Now the valley has someone to watch over it.'] },
      ],
      diario: 'Master Candeia’s Diary', diarioCurto: 'Candeia’s Diary', pagina: 'Page', ler: 'Read',
      novaPagina: 'New page in Candeia’s Diary', bloqueada: (g) => 'Defeat ' + g + ' to find this page.',
      voltar: 'Back to the diary', fechar: 'Close',
      diarioSub: 'Pages Candeia left along the way. Each Guardian defeated reveals one.',
      final: {
        olho: 'End of the first descent', titulo: 'The Lume rises again',
        txt: [
          'The Heart’s fever breaks. A column of light rises through the ashes, through the mines, the drowned city, the crypt and the roots, and reaches the top of the valley.',
          'In Daybreak, the great lamp shines again. The rivers clear, the forests breathe and, for the first time in a generation, the village windows light up on their own.',
        ],
        citacao: '“Now the valley has someone to watch over it.”', autor: 'the echo of Master Candeia',
        lenda: 'In Daybreak, they already call you the <b>Legend of Lumevale</b>.',
        gancho: 'But in the silence after the fever, something stirs beneath the Heart…',
        depois: 'The Heart’s scar never fully heals: the Guardians still awaken from time to time. Keep hunting, be reborn to grow stronger and keep the light rising.',
        botao: 'Continue',
      },
      resumoT: 'The story',
      resumo: [
        '<b>Lumevale</b> is a valley where light comes from below: the <b>Lume</b> is born in the Heart, deep under the earth, and rises like sap. The <b>Lumes</b> you collect are drops of it, crystallized.',
        'In the <b>Fading</b>, the Lume stopped rising: the rivers turned grey, the forests wither and the <b>Murks</b> appeared, total darkness with no light inside.',
        '<b>Lume Tamers</b> care for the light together with the <b>Glimmers</b>, creatures born from the Lume. The lantern is a shelter: when its light is weak, a Glimmer agrees to come in.',
        'The <b>Murks</b> form where the Lume was torn away and have no flame at all, nothing the lantern can shelter: that is why they cannot be tamed. Once undone, they release the Lume they swallowed in drops.',
        'Each layer has a <b>Guardian</b> that, sick, holds the light and seals the way. Beating it frees the light, but it awakens again while the valley is not healed.',
        'Every light that goes out leaves an <b>echo</b>. When you are reborn, what you learned stays in the Sanctuary of Echoes.',
        'You were the apprentice of <b>Master Candeia</b>, who went down to heal the Heart and never returned. Go down, bring the light back to <b>Daybreak</b> and find out what happened to her.',
      ],
      santuario: 'Every light that goes out leaves an echo. Someone keeps these Echoes for you: a voice that sounds familiar. Sanctuary upgrades apply to every journey.',
      santuarioFinal: 'The echo of Master Candeia keeps this Sanctuary. Every light that goes out leaves an echo, and the upgrades here apply to every journey.',
      tutorialSub: 'The clearing where apprentices meet their first Glimmer.',
    },
  };
  LV.historia = () => (LV.idioma === 'en' ? T.en : T.pt);
})();
