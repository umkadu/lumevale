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
        'Lantern (bottom right): capture. Book: Journal. Eye: Bestiary. Trophy: Achievements. Gear: Settings.',
        'The button next to the pets switches the pet mode.',
      ] : [
        '<b>A/D</b> or arrows: walk · <b>Space</b>: jump · <b>W/S</b>: stairs and dropping through platforms.',
        'Click the scenery to walk there. <b>Left-click</b> a creature: only the tamer attacks. <b>Right-click</b>: the tamer and the pets attack together.',
        '<b>Q</b>: lantern (capture) · <b>1, 2, 3</b>: pet mode · <b>B</b>: Bestiary · <b>C</b>: Achievements · <b>Esc</b>: Settings.',
      ]],
      ['Pets in the field', [
        'Up to 3 pets fight with you (more with <b>Extra Bond</b> in the Shop and <b>Eternal Bond</b> in the Sanctuary). The rest wait in the Collection: drag them to a free slot.',
        'Modes: <b>Aggressive</b> attacks everything nearby, <b>Defender</b> only whoever attacks first, <b>Passive</b> never attacks.',
        'A pet that runs out of health faints and returns after 10 s.',
        'Pets can only be up to 10 levels above the tamer.',
      ]],
      ['Elements', elementos(true).concat(['A pet’s element shows next to its name. Use strong elements against each map’s creatures.'])],
      ['Capture', [
        (movel ? 'Tap' : 'Click') + ' the lantern' + (movel ? '' : ' (or press Q)') + ': the game pauses and wild creatures show their chance. Then pick one.',
        'The chance is rolled when the lantern hits. At full health it is about <b>30%</b> in the first areas and lower for high-level creatures. <b>The less health, the higher the chance</b> (up to about 85%).',
        'If it holds, the minigame starts: close the lantern while the pointer is in the light zone, within 5 s. In the <b>golden center</b> the pet may gain a talent (Fierce, Sturdy or Nimble).',
        'Docile creatures only fight back; aggressive ones attack whoever comes near their nest. The <b>Murks</b> (total darkness, no light inside) can’t be caught and always attack.',
        'Lanterns are bought in the Shop.',
      ]],
      ['Evolution and abilities', [
        'Each species has 3 forms. To evolve you need level <b>' + evo[0] + '</b> (then <b>' + evo[1] + '</b>), materials and Lumes. A golden ▲ badge marks pets ready to evolve.',
        'Each species has a special ability with a cooldown. Upgrade it up to level 10 in the pet’s details.',
      ]],
      ['Tamer and attributes', [
        'Each tamer level gives 3 points: <b>Strength</b> (damage), <b>Vigor</b> (health), <b>Luck</b> (capture, gathering, critical) and <b>Bond</b> (pet XP and attack speed).',
        'Each tamer level also gives +1% damage and health to all pets. New titles change the cloak and the lantern.',
      ]],
      ['Shop and Guardian coins', [
        'Upgrades cost Lumes plus coins that only Guardians drop (each Guardian has its own coin).',
        'Shop upgrades are lost when you are reborn.',
      ]],
      ['Guardians and maps', [
        'Defeat creatures on the map until the goal (' + metas + ') and tap <b>Challenge Guardian</b>.',
        'The fight lasts 60 s and ends if every pet faints. During the challenge the tamer and the pets attack the Guardian on their own.',
        'Each victory lowers the goal by 2. Past the goal, 10% of kills are saved for the next summon.',
        'The first victory opens the next map and gives you a new pet. In the Maps tab, tap a map to preview it and travel (the game pauses while the tab is open).',
      ]],
      ['Auto-hunt', [
        'Unlocked after beating the first Guardian (or from the start with <b>Trail Memory</b>). The tamer walks to enemies, uses stairs and picks up drops by itself.',
      ]],
      ['Rebirth and Sanctuary', [
        'After the first Guardian you can be reborn: you start over and earn <b>Echoes</b> (more for each Guardian beaten and for a high tamer level).',
        'You lose pets, levels, Lumes, materials, coins, Shop upgrades and maps. You keep Echoes, the Sanctuary, achievements and the Bestiary.',
        'Echoes buy permanent upgrades and automatic attributes.',
      ]],
      ['Achievements and Bestiary', [
        'Achievements give lanterns, Lumes, Echoes, bonuses against creatures and even Radiant pets. Claim them at the trophy. They last forever.',
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
        'Lanterna (canto de baixo): captura. Livro: Diário. Olho: Bestiário. Troféu: Conquistas. Engrenagem: Configurações.',
        'O botão ao lado dos pets troca o modo deles.',
      ] : [
        '<b>A/D</b> ou setas: andar · <b>Espaço</b>: pular · <b>W/S</b>: escadas e atravessar plataformas.',
        'Clique no cenário para ir até lá. <b>Clique esquerdo</b> numa criatura: só o domador ataca. <b>Clique direito</b>: o domador e os pets atacam juntos.',
        '<b>Q</b>: lanterna (captura) · <b>1, 2, 3</b>: modo dos pets · <b>B</b>: Bestiário · <b>C</b>: Conquistas · <b>Esc</b>: Configurações.',
      ]],
      ['Pets em campo', [
        'Até 3 pets lutam com você (mais com <b>Laço Extra</b> na Loja e <b>Vínculo Eterno</b> no Santuário). Os outros ficam na Coleção: arraste até uma vaga livre.',
        'Modos: <b>Agressivo</b> ataca tudo por perto, <b>Defensor</b> só quem atacar primeiro, <b>Passivo</b> não ataca.',
        'Pet sem vida desmaia e volta em 10 s.',
        'Os pets só passam 10 níveis acima do domador.',
      ]],
      ['Elementos', elementos(false).concat(['O elemento aparece ao lado do nome do pet. Use elementos fortes contra as criaturas de cada mapa.'])],
      ['Captura', [
        (movel ? 'Toque' : 'Clique') + ' na lanterna' + (movel ? '' : ' (ou aperte Q)') + ': o jogo pausa e as criaturas selvagens mostram a chance. Depois escolha uma.',
        'A chance é sorteada quando a lanterna acerta. Com vida cheia é cerca de <b>30%</b> nas primeiras áreas e menor em criaturas de nível alto. <b>Quanto menos vida, maior a chance</b> (até uns 85%).',
        'Se prender, vem o minijogo: feche a lanterna com o ponteiro na faixa clara, em até 5 s. No <b>centro dourado</b> o pet pode ganhar um talento (Feroz, Robusto ou Ágil).',
        'Criaturas mansas só revidam; as agressivas atacam quem chega perto do ninho. Os <b>Breus</b> (escuridão completa, sem nenhuma luz dentro) não podem ser capturados e atacam sempre.',
        'Lanternas são compradas na Loja.',
      ]],
      ['Evolução e habilidades', [
        'Cada espécie tem 3 formas. Para evoluir: nível <b>' + evo[0] + '</b> (depois <b>' + evo[1] + '</b>), materiais e Lumes. O selo dourado ▲ mostra quem já pode evoluir.',
        'Cada espécie tem uma habilidade especial com recarga. Melhore até o nível 10 no detalhe do pet.',
      ]],
      ['Domador e atributos', [
        'Cada nível do domador dá 3 pontos: <b>Força</b> (dano), <b>Vigor</b> (vida), <b>Sorte</b> (captura, coleta e crítico) e <b>Vínculo</b> (XP dos pets e velocidade de ataque).',
        'Cada nível do domador também dá +1% de dano e vida a todos os pets. Novos títulos mudam a capa e a lanterna.',
      ]],
      ['Loja e moedas dos Guardiões', [
        'As melhorias custam Lumes e moedas que só os Guardiões soltam (cada Guardião tem a sua).',
        'As melhorias da Loja se perdem ao renascer.',
      ]],
      ['Guardiões e mapas', [
        'Derrote criaturas do mapa até a meta (' + metas + ') e toque em <b>Desafiar Guardião</b>.',
        'A luta dura 60 s e acaba se todos os pets desmaiarem. Durante o desafio, o domador e os pets atacam o Guardião sozinhos.',
        'Cada vitória baixa a meta em 2. Depois da meta, 10% dos abates ficam guardados para a próxima invocação.',
        'A primeira vitória abre o próximo mapa e dá um pet novo. Na aba Mapas, toque num mapa para ver a prévia e viajar (o jogo pausa com a aba aberta).',
      ]],
      ['Caçada automática', [
        'Liberada depois do primeiro Guardião (ou desde o início com <b>Memória da Trilha</b>). O domador anda sozinho até os inimigos, usa escadas e coleta o que cai.',
      ]],
      ['Renascer e Santuário', [
        'Depois do primeiro Guardião você pode renascer: volta ao começo e ganha <b>Ecos</b> (mais Ecos a cada Guardião vencido e com o domador em nível alto).',
        'Você perde pets, níveis, Lumes, materiais, moedas, melhorias da Loja e mapas. Ficam os Ecos, o Santuário, as conquistas e o Bestiário.',
        'Os Ecos compram melhorias permanentes e atributos automáticos.',
      ]],
      ['Conquistas e Bestiário', [
        'Conquistas dão lanternas, Lumes, Ecos, bônus contra criaturas e até pets Radiantes. Resgate no troféu. Valem para sempre.',
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
