'use strict';
/* Lumevale — aba Ajuda: como o jogo funciona, em seções curtas. Texto em português e inglês aqui mesmo
   (é texto corrido, não vale espalhar no dicionário). A tabela de elementos sai dos dados do jogo. */
(function () {
  const LV = window.LV;

  function elementos(en) {
    return Object.keys(LV.EL).map((id) => {
      const e = LV.EL[id], nomes = (l) => l.map((x) => '<b style="color:' + LV.EL[x].cor + '">' + LV.EL[x].nome + '</b>').join(', ');
      const nome = '<b style="color:' + e.cor + '">' + e.nome + '</b>';
      return en
        ? nome + ' deals <b>+50%</b> damage to ' + nomes(e.forte) + ' and <b>−30%</b> to ' + nomes(e.fraco) + '.'
        : nome + ' causa <b>+50%</b> de dano em ' + nomes(e.forte) + ' e <b>−30%</b> em ' + nomes(e.fraco) + '.';
    });
  }

  LV.ajuda = function () {
    const en = LV.idioma === 'en', movel = !!LV.movel;
    const evo = LV.F && LV.F.evoNivel ? LV.F.evoNivel : [18, 40];
    const metas = LV.MAPS.map((m) => m.killsChefe).join(' / ');
    if (en) return [
      ['Getting started', [
        'You are a Lume Tamer descending into the depths of Lumevale with your <b>Glimmers</b> (the pets). They fight on their own near you.',
        'Defeat creatures to earn XP, <b>Lumes</b> (◆, drops of crystallized Lume, the main currency) and materials.',
        'Catch wild creatures with the lantern to grow your team.',
        'Each map has a <b>Guardian</b>. Beating it opens the next, deeper map.',
      ]],
      ['Controls', movel ? [
        '<b>◀ ▶</b> walk · <b>▲</b> jump or climb stairs · <b>▼</b> go down stairs or drop through a platform.',
        'Tap the scenery to walk there. <b>Tap a creature</b>: only the tamer attacks. <b>Hold your finger</b> on it: the tamer and the pets attack together.',
        'Stairs: jump and land on a staircase to climb it. Walking sideways or dropping down, you pass through it.',
        'Lantern (bottom right): capture. Book: Journal. Eye: Bestiary. Trophy: Achievements. Gear: Settings.',
        'The button next to the pets switches the pet mode.',
      ] : [
        '<b>A/D</b> or arrows: walk · <b>Space</b>: jump · <b>W/S</b>: stairs and dropping through platforms.',
        'Click the scenery to walk there. <b>Left-click</b> a creature: only the tamer attacks. <b>Right-click</b>: the tamer and the pets attack together.',
        'Stairs: jump and land on a staircase to climb it. Walking sideways or dropping down, you pass through it.',
        '<b>Q</b>: lantern (capture) · <b>1, 2, 3</b>: pet mode · <b>O</b>: Bestiary · <b>C</b>: Achievements · <b>Esc</b>: Settings.',
        'Journal tabs: <b>E</b> Team · <b>T</b> Tamer · <b>L</b> Shop · <b>M</b> Maps · <b>R</b> Sanctuary · <b>B</b> Satchel · <b>H</b> Help. Press the same key again to close.',
      ]],
      ['Pets in the field', [
        'Up to 3 pets fight with you (more with <b>Extra Bond</b> in the Shop and <b>Eternal Bond</b> in the Sanctuary). The rest wait in the Collection: drag them to a free slot.',
        'Modes: <b>Aggressive</b> attacks everything nearby, <b>Defender</b> only whoever attacks first, <b>Passive</b> never attacks.',
        'A pet that runs out of health faints and returns after 10 s.',
        'Pets can only be up to ' + LV.F.capPet(0) + ' levels above the tamer.',
      ]],
      ['Elements', elementos(true).concat(['A pet’s element shows next to its name. Use strong elements against each map’s creatures.'])],
      ['Capture', [
        (movel ? 'Tap' : 'Click') + ' the lantern' + (movel ? '' : ' (or press Q)') + ': the game pauses and wild creatures show their chance. Then pick one.',
        'The chance is rolled when the lantern hits. At full health it is about <b>30%</b> in the first areas and lower for high-level creatures. <b>The less health, the higher the chance</b> (up to about 85%).',
        'If it holds, the minigame starts: close the lantern' + (movel ? '' : ' (click or <b>Space</b>)') + ' while the pointer is in the light zone, within 5 s. In the <b>golden center</b> the pet may gain a talent (Fierce, Sturdy or Nimble).',
        'Docile creatures only fight back; aggressive ones attack whoever comes near their nest. The <b>Murks</b> (total darkness, no light inside) can’t be caught and always attack. Each map has its own Murks, and nests mix several kinds.',
        'Lanterns are bought in the Shop.',
      ]],
      ['Evolution and abilities', [
        'Each species has 3 forms. To evolve you need level <b>' + evo[0] + '</b> (then <b>' + evo[1] + '</b>), materials and Lumes. A golden ▲ badge marks pets ready to evolve.',
        'Each species has <b>5 special attacks</b> (species of the same element share some). The 1st comes from the start; the others unlock at level 12, at the 1st evolution, at level 32 and at the 2nd evolution.',
        'Up to <b>2 attacks</b> can be equipped, each with its own cooldown. Choose them in the pet’s details (Team tab). Upgrading (up to level 10) makes all of them stronger.',
      ]],
      ['Tamer and attributes', [
        'Each tamer level gives 3 points: <b>Strength</b> (damage), <b>Vigor</b> (health), <b>Luck</b> (capture, gathering, critical) and <b>Bond</b> (pet XP and attack speed).',
        'Each tamer level also gives +1% damage and health to all pets.',
      ]],
      ['Cloaks and lanterns', [
        'In the <b>Tamer</b> tab you choose the tamer’s cloak and lantern. Locked items show how to unlock them.',
        '<b>Common cloaks</b> are purely visual and yours forever: they come from achievements or from the Shop (one-time purchase).',
        '<b>Lanterns</b> change the lantern strike: piercing crystal beam, ember blast, tide that slows, shadow that weakens, or healing for the whole team (the Healing Lantern doesn’t attack). Achievement lanterns are permanent; Shop lanterns last until you rebirth.',
        'Each <b>Guardian</b> drops a themed item on its first defeat of each journey (a cloak or a lantern with real bonuses). It comes equipped and is gone when you rebirth.',
      ]],
      ['Shop and Guardian coins', [
        'Upgrades cost Lumes plus coins that only Guardians drop (each Guardian has its own coin).',
        'The Shop also sells cloaks (purely visual, one-time purchase you keep forever) and special lanterns (they last until you rebirth).',
        'Shop upgrades and lanterns are lost when you are reborn.',
      ]],
      ['Guardians and maps', [
        'Defeat creatures on the map until the goal (' + metas + ') and tap <b>Challenge Guardian</b>.',
        'The fight lasts 60 s and ends if every pet faints. During the challenge the tamer and the pets attack the Guardian on their own (pets in <b>Passive</b> mode stay out unless you order them with a right-click or long press).',
        'The goal never changes. Past the goal, 10% of kills are saved for the next summon.',
        'Each Guardian has a basic attack and two specials from its theme: roots, poison gas, anchor and water, light, chains and fire. Specials are announced first: circles and stripes on the ground show where they will hit. Some poison, root or stun the pets.',
        'The first victory opens the next map, gives you a new pet and a themed item (cloak or lantern). In the Maps tab, tap a map to preview it and travel (the game pauses while the preview is open).',
      ]],
      ['Auto-hunt', [
        'Unlocked after beating the first Guardian (or from the start with <b>Trail Memory</b>). The tamer walks to enemies, uses stairs and picks up drops by itself.',
        '<b>Auto Challenge</b> (Sanctuary, one stage per map): when the kill goal is reached, the Guardian is challenged by itself. Turn it on with the button next to Auto-hunt; it starts off every time you enter a map, and after a defeat it waits 20 s before trying again.',
      ]],
      ['Rebirth and Sanctuary', [
        'After the first Guardian you can be reborn: you start over and earn <b>Echoes</b> (more for each Guardian beaten and for a high tamer level).',
        'You lose pets, levels, Lumes, materials, coins, Shop upgrades and lanterns, Guardian items and maps. You keep Echoes, the Sanctuary, achievements, visual cloaks and the Bestiary.',
        'Echoes buy permanent upgrades and automatic attributes.',
      ]],
      ['Achievements and Bestiary', [
        'Achievements give capture lanterns, Lumes, Echoes, bonuses against creatures, cloaks, special lanterns and even Radiant pets. Claim them at the trophy. They last forever.',
        'The Bestiary records every form you have met and where it lives.',
      ]],
      ['Away from the game', [
        'Your pets keep hunting while you are away (up to the Campsite limit, upgradable in the Shop). When you return you see what they earned.',
        'After a few idle minutes the rest screen appears (adjust it in Settings).',
      ]],
      ['Saves, language and updates', [
        '3 save slots. Progress stays on this device; to take it to another, use Settings › Transfer progress.',
        'Change the language in Settings. The app installed from the website updates itself.',
      ]],
    ];
    return [
      ['Primeiros passos', [
        'Você é um Domador de Lume e desce pelas profundezas de Lumevale com suas <b>Centelhas</b> (os pets). Elas lutam sozinhas perto de você.',
        'Derrote criaturas para ganhar XP, <b>Lumes</b> (◆, gotas de Lume cristalizado, a moeda principal) e materiais.',
        'Capture criaturas selvagens com a lanterna para aumentar sua equipe.',
        'Cada mapa tem um <b>Guardião</b>. Vencê-lo abre o próximo mapa, mais fundo.',
      ]],
      ['Controles', movel ? [
        '<b>◀ ▶</b> andar · <b>▲</b> pular ou subir escada · <b>▼</b> descer escada ou atravessar plataforma.',
        'Toque no cenário para ir até lá. <b>Toque numa criatura</b>: só o domador ataca. <b>Segure o dedo</b> nela: o domador e os pets atacam juntos.',
        'Escadas: pule e caia em cima de uma escada para subir por ela. Andando de lado ou descendo, você passa direto.',
        'Lanterna (canto de baixo): captura. Livro: Diário. Olho: Bestiário. Troféu: Conquistas. Engrenagem: Configurações.',
        'O botão ao lado dos pets troca o modo deles.',
      ] : [
        '<b>A/D</b> ou setas: andar · <b>Espaço</b>: pular · <b>W/S</b>: escadas e atravessar plataformas.',
        'Clique no cenário para ir até lá. <b>Clique esquerdo</b> numa criatura: só o domador ataca. <b>Clique direito</b>: o domador e os pets atacam juntos.',
        'Escadas: pule e caia em cima de uma escada para subir por ela. Andando de lado ou descendo, você passa direto.',
        '<b>Q</b>: lanterna (captura) · <b>1, 2, 3</b>: modo dos pets · <b>O</b>: Bestiário · <b>C</b>: Conquistas · <b>Esc</b>: Configurações.',
        'Abas do Diário: <b>E</b> Equipe · <b>T</b> Domador · <b>L</b> Loja · <b>M</b> Mapas · <b>R</b> Santuário · <b>B</b> Bolsa · <b>H</b> Ajuda. Apertar a mesma tecla de novo fecha.',
      ]],
      ['Pets em campo', [
        'Até 3 pets lutam com você (mais com <b>Laço Extra</b> na Loja e <b>Vínculo Eterno</b> no Santuário). Os outros ficam na Coleção: arraste até uma vaga livre.',
        'Modos: <b>Agressivo</b> ataca tudo por perto, <b>Defensor</b> só quem atacar primeiro, <b>Passivo</b> não ataca.',
        'Pet sem vida desmaia e volta em 10 s.',
        'Os pets só passam ' + LV.F.capPet(0) + ' níveis acima do domador.',
      ]],
      ['Elementos', elementos(false).concat(['O elemento aparece ao lado do nome do pet. Use elementos fortes contra as criaturas de cada mapa.'])],
      ['Captura', [
        (movel ? 'Toque' : 'Clique') + ' na lanterna' + (movel ? '' : ' (ou aperte Q)') + ': o jogo pausa e as criaturas selvagens mostram a chance. Depois escolha uma.',
        'A chance é sorteada quando a lanterna acerta. Com vida cheia é cerca de <b>30%</b> nas primeiras áreas e menor em criaturas de nível alto. <b>Quanto menos vida, maior a chance</b> (até uns 85%).',
        'Se prender, vem o minijogo: feche a lanterna' + (movel ? '' : ' (clique ou <b>Espaço</b>)') + ' com o ponteiro na faixa clara, em até 5 s. No <b>centro dourado</b> o pet pode ganhar um talento (Feroz, Robusto ou Ágil).',
        'Criaturas mansas só revidam; as agressivas atacam quem chega perto do ninho. Os <b>Breus</b> (escuridão completa, sem nenhuma luz dentro) não podem ser capturados e atacam sempre. Cada mapa tem os seus Breus, e os ninhos misturam vários tipos.',
        'Lanternas são compradas na Loja.',
      ]],
      ['Evolução e habilidades', [
        'Cada espécie tem 3 formas. Para evoluir: nível <b>' + evo[0] + '</b> (depois <b>' + evo[1] + '</b>), materiais e Lumes. O selo dourado ▲ mostra quem já pode evoluir.',
        'Cada espécie tem <b>5 ataques especiais</b> (espécies do mesmo elemento dividem alguns). O 1º vem de início; os outros se liberam no nível 12, na 1ª evolução, no nível 32 e na 2ª evolução.',
        'Até <b>2 ataques</b> ficam equipados, cada um com a sua recarga. Escolha no detalhe do pet (aba Equipe). Melhorar (até o nível 10) deixa todos mais fortes.',
      ]],
      ['Domador e atributos', [
        'Cada nível do domador dá 3 pontos: <b>Força</b> (dano), <b>Vigor</b> (vida), <b>Sorte</b> (captura, coleta e crítico) e <b>Vínculo</b> (XP dos pets e velocidade de ataque).',
        'Cada nível do domador também dá +1% de dano e vida a todos os pets.',
      ]],
      ['Capas e lanternas', [
        'Na aba <b>Domador</b> você escolhe a capa e a lanterna do domador. Os itens trancados mostram como liberar.',
        '<b>Capas comuns</b> são só visuais e ficam para sempre: saem das conquistas ou da Loja (compra única).',
        'As <b>lanternas</b> mudam o golpe da lanterna: feixe de cristal que atravessa, explosão de brasa, maré que deixa lento, sombra que enfraquece ou cura para o grupo todo (a Lanterna de Cura não ataca). As das conquistas ficam para sempre; as da Loja valem até renascer.',
        'Cada <b>Guardião</b> deixa um item temático na primeira vitória de cada jornada (uma capa ou lanterna com bônus de verdade). Ele já vem equipado e some ao renascer.',
      ]],
      ['Loja e moedas dos Guardiões', [
        'As melhorias custam Lumes e moedas que só os Guardiões soltam (cada Guardião tem a sua).',
        'A Loja também vende capas (só visuais, compra única que fica para sempre) e lanternas especiais (valem até renascer).',
        'As melhorias e as lanternas da Loja se perdem ao renascer.',
      ]],
      ['Guardiões e mapas', [
        'Derrote criaturas do mapa até a meta (' + metas + ') e toque em <b>Desafiar Guardião</b>.',
        'A luta dura 60 s e acaba se todos os pets desmaiarem. Durante o desafio, o domador e os pets atacam o Guardião sozinhos (pets no modo <b>Passivo</b> ficam de fora, a não ser que você mande com o clique direito ou o toque longo).',
        'A meta é sempre a mesma. Depois dela, 10% dos abates ficam guardados para a próxima invocação.',
        'Cada Guardião tem um ataque básico e dois especiais do seu tema: raízes, gás venenoso, âncora e água, luz, correntes e fogo. Os especiais são avisados antes: círculos e faixas no chão mostram onde vão cair. Alguns envenenam, prendem ou atordoam os pets.',
        'A primeira vitória abre o próximo mapa, dá um pet novo e um item temático (capa ou lanterna). Na aba Mapas, toque num mapa para ver a prévia e viajar (o jogo pausa enquanto a prévia está aberta).',
      ]],
      ['Caçada automática', [
        'Liberada depois do primeiro Guardião (ou desde o início com <b>Memória da Trilha</b>). O domador anda sozinho até os inimigos, usa escadas e coleta o que cai.',
        '<b>Desafio Automático</b> (Santuário, uma etapa por mapa): ao completar a meta de abates, o Guardião é desafiado sozinho. Ligue no botão ao lado da Caçada Auto; ele começa desligado sempre que você entra num mapa e, depois de uma derrota, espera 20 s antes de tentar de novo.',
      ]],
      ['Renascer e Santuário', [
        'Depois do primeiro Guardião você pode renascer: volta ao começo e ganha <b>Ecos</b> (mais Ecos a cada Guardião vencido e com o domador em nível alto).',
        'Você perde pets, níveis, Lumes, materiais, moedas, melhorias e lanternas da Loja, itens dos Guardiões e mapas. Ficam os Ecos, o Santuário, as conquistas, as capas visuais e o Bestiário.',
        'Os Ecos compram melhorias permanentes e atributos automáticos.',
      ]],
      ['Conquistas e Bestiário', [
        'Conquistas dão lanternas de captura, Lumes, Ecos, bônus contra criaturas, capas, lanternas especiais e até pets Radiantes. Resgate no troféu. Valem para sempre.',
        'O Bestiário registra cada forma que você encontrou e onde ela vive.',
      ]],
      ['Fora do jogo', [
        'Seus pets continuam caçando enquanto você está fora (até o limite do Acampamento, que melhora na Loja). Na volta, você vê o que eles ganharam.',
        'Parado por alguns minutos, aparece a tela de descanso (ajuste em Configurações).',
      ]],
      ['Saves, idioma e atualizações', [
        '3 espaços de save. O progresso fica neste aparelho; para levar a outro, use Configurações › Levar o progresso.',
        'O idioma fica em Configurações. O app instalado pelo site se atualiza sozinho.',
      ]],
    ];
  };
})();
