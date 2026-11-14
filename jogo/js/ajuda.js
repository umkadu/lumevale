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
        'You are a Lume Tamer descending into the depths of Lumevale with your <b>Glimmers</b>. They fight on their own near you.',
        'Defeat creatures to earn XP, <b>Lumes</b> (◆, drops of crystallized Lume, the main currency) and materials.',
        'Catch wild creatures with the lantern to grow your team.',
        'Each map has a <b>Guardian</b>. Beating it opens the next, deeper map.',
      ]],
      ['Controls', movel ? [
        '<b>◀ ▶</b> walk · <b>▲</b> jump or climb stairs · <b>▼</b> go down stairs or drop through a platform.',
        'Tap the scenery to walk there. <b>Tap a creature</b>: only the tamer attacks. <b>Hold your finger</b> on it: the tamer and the Glimmers attack together.',
        'Stairs: jump and land on a staircase to climb it. Walking sideways or dropping down, you pass through it.',
        'Lantern (bottom right): capture. Book: Journal. Eye: Bestiary. Trophy: Achievements. Gear: Settings.',
        'The button next to the Glimmers switches their mode.',
      ] : [
        '<b>A/D</b> or arrows: walk · <b>Space</b>: jump · <b>W/S</b>: stairs and dropping through platforms.',
        'Click the scenery to walk there. <b>Left-click</b> a creature: only the tamer attacks. <b>Right-click</b>: the tamer and the Glimmers attack together.',
        'Stairs: jump and land on a staircase to climb it. Walking sideways or dropping down, you pass through it.',
        '<b>Q</b>: lantern (capture) · <b>1, 2, 3</b>: Glimmer mode · <b>4 to 8</b>: tamer skills · <b>O</b>: Bestiary · <b>C</b>: Achievements · <b>Esc</b>: Settings.',
        'Journal tabs: <b>E</b> Team · <b>T</b> Tamer · <b>M</b> Maps · <b>R</b> Sanctuary · <b>B</b> Satchel · <b>H</b> Help. Press the same key again to close.',
      ]],
      ['Glimmers in the field', [
        'Up to 3 Glimmers fight with you (more with <b>Extra Bond</b> from Master Anvil and <b>Eternal Bond</b> in the Sanctuary). The rest wait in the Collection: drag them to a free slot.',
        'Modes: <b>Aggressive</b> attacks everything nearby, <b>Defender</b> only whoever attacks first, <b>Passive</b> never attacks.',
        'A Glimmer that runs out of health faints and returns after 10 s.',
        'Glimmers can only be up to ' + LV.F.capPet(0) + ' levels above the tamer.',
      ]],
      ['Elements', elementos(true).concat(['A Glimmer’s element shows next to its name. Use strong elements against each map’s creatures.'])],
      ['Capture', [
        (movel ? 'Tap' : 'Click') + ' the lantern' + (movel ? '' : ' (or press Q)') + ': the game pauses and wild creatures show their chance. Then pick one.',
        'The chance is rolled when the lantern hits. At full health it is about <b>30%</b> in the first areas and lower for high-level creatures. <b>The less health, the higher the chance</b> (up to about 85%).',
        'If it holds, the minigame starts: close the lantern' + (movel ? '' : ' (click or <b>Space</b>)') + ' while the pointer is in the light zone, within 5 s. In the <b>golden center</b> the Glimmer may gain a talent (Fierce, Sturdy or Nimble).',
        'Docile creatures only fight back; aggressive ones attack whoever comes near their nest. The <b>Murks</b> (total darkness, no light inside) can’t be caught and always attack. Each map has its own Murks, and nests mix several kinds.',
        'Lanterns are bought from <b>Master Wick</b>, in Daybreak Village.',
      ]],
      ['Evolution and abilities', [
        'Each species has 3 forms. To evolve you need level <b>' + evo[0] + '</b> (then <b>' + evo[1] + '</b>), materials and Lumes. A golden ▲ badge marks Glimmers ready to evolve.',
        'Each species has a <b>specialty</b>, shown in the Glimmer’s details: <b>Damage</b> (single target), <b>Area</b>, <b>Support</b> (healing and buffs), <b>Control</b> (roots, stuns, slows) or <b>Tank</b> (health, taunts and team protection). It slightly changes health and attack.',
        'Each species has <b>5 special attacks</b> that mix its specialty with self buffs, team buffs, crowd control and raw damage. The 1st comes from the start; the others unlock at level <b>25</b>, at level <b>40</b> after the 1st evolution, at level <b>55</b> and at level <b>65</b> after the 2nd evolution.',
        'Up to <b>2 attacks</b> can be equipped, each with its own cooldown. Choose them in the Glimmer’s details (Team tab). Upgrading (up to level 10) makes all of them stronger.',
      ]],
      ['Tamer and attributes', [
        'Each tamer level gives 3 points: <b>Strength</b> (damage), <b>Vigor</b> (health), <b>Luck</b> (capture, gathering, critical) and <b>Bond</b> (Glimmer XP and attack speed).',
        'Each tamer level also gives +1% damage and health to all Glimmers.',
        'The <b>Tamer</b> tab shows the tamer’s data and current bonuses; below are the <b>Stats</b>, <b>Skills</b>, <b>Cloaks</b> and <b>Lanterns</b> menus (only one opens at a time).',
        'In Stats, the button at the top picks how many points each <b>+</b> adds: 1, 5, 10 or 100 (with fewer free points, it adds all of them).',
      ]],
      ['Tamer skills', [
        'Every <b>3 tamer levels</b> give <b>1 skill point</b>. Unlocking a skill costs 1 point; its next levels cost 1 (up to 4), 2 (up to 7) and 3 (up to 10). Skills reset when you are reborn.',
        '<b>Command Shout</b> (level 5): more damage for every Glimmer · <b>Sure Gaze</b> (level 15): higher lantern capture chance · <b>Lume Rhythm</b> (level 25): Glimmers attack faster and recharge special attacks faster · <b>Mantle of Light</b> (level 30): heals the group and reduces damage taken · <b>Golden Harvest</b> (level 40): pulls every drop and gives more Lumes, materials and XP.',
        'Use them with the round buttons ' + (movel ? 'above the controls' : 'at the bottom of the screen (or keys <b>4 to 8</b>)') + '. Each one lasts a few seconds and then recharges.',
      ]],
      ['Profile and titles', [
        (movel ? 'Tap' : 'Click') + ' the tamer’s portrait in the Tamer tab to open the <b>Profile</b>: name, look, title and your numbers (enemies defeated, Glimmers captured, rebirths and more).',
        '<b>Titles</b> come from achievements (when you claim the reward) and each gives a bonus: more XP, damage, capture chance, chance for Radiant Glimmers, less damage from ember creatures, more Echoes. The harder the achievement, the bigger the bonus. Equip one in the Profile; without a title, your level rank shows under your name.',
      ]],
      ['Cloaks and lanterns', [
        'In the <b>Tamer</b> tab (Cloaks and Lanterns menus) you choose the tamer’s cloak and lantern. Locked items show how to unlock them.',
        '<b>Common cloaks</b> are purely visual and yours forever: they come from achievements or from Madam Needle, the village tailor (one-time purchase).',
        '<b>Lanterns</b> change the lantern strike: piercing crystal beam, ember blast, tide that slows, shadow that weakens, or healing for the whole team (the Healing Lantern doesn’t attack). Achievement lanterns are permanent; the ones bought in the village last until you rebirth. Each lantern fires its own projectile.',
        'Each <b>Guardian</b> drops a themed item on its first defeat of each journey (a cloak or a lantern with real bonuses). It comes equipped and is gone when you rebirth.',
      ]],
      ['Daybreak Village', [
        'Your adventure starts in <b>Daybreak Village</b>; come back any time from the <b>Maps</b> tab (the Daybreak section, at the top). The <b>exit sign</b> at the far right of the village leads down to the Whispering Roots. Click a villager to walk over and talk. Only the tamer and the Glimmer in the first slot go to the village.',
        '<b>Master Wick</b> sells capture and special lanterns · <b>Madam Needle</b> sells cloaks · <b>Master Anvil</b> sells upgrades for Lumes plus Guardian coins (each Guardian drops its own) · <b>Old Barter</b> trades materials between neighboring depths (5 for 1 going deeper, 1 for 2 going up) · <b>Keeper Iris</b> brings back achievement Radiants you lost when reborn (50,000 Lumes each) · the <b>Sanctuary of Echoes</b> sells permanent upgrades and is where you are reborn.',
        'Upgrades and lanterns bought in the village are lost when you are reborn.',
      ]],
      ['Training Ground', [
        'Through the village gate (or the Maps tab) you reach the <b>Training Ground</b>: three dummies that never fall and a <b>damage per second</b> meter at the top of the screen, split by tamer and Glimmer. The portal on the left takes you back to the village.',
        'Glimmers follow the command mode: <b>Aggressive</b> attacks the dummies, <b>Defender</b> only the dummy you hit, <b>Passive</b> doesn’t attack. Use it to compare attacks, specialties, skills and lanterns. Nothing is earned or lost there.',
      ]],
      ['Guardians and maps', [
        'Defeat creatures on the map until the goal (' + metas + ') and tap <b>Challenge Guardian</b>.',
        'The fight lasts 60 s and ends if every Glimmer faints. During the challenge the tamer and the Glimmers attack the Guardian on their own (Glimmers in <b>Passive</b> mode stay out unless you order them with a right-click or long press).',
        'The goal never changes. Past the goal, 10% of kills are saved for the next summon.',
        'Each Guardian has a basic attack and two specials from its theme: roots, poison gas, anchor and water, light, chains and fire. Specials are announced first: circles and stripes on the ground show where they will hit. Some poison, root or stun the Glimmers.',
        'The first victory opens the next map, gives you a new Glimmer and a themed item (cloak or lantern). In the Maps tab, tap a map to preview it and travel (the game pauses while the preview is open).',
      ]],
      ['Auto-hunt', [
        'Unlocked after beating the first Guardian (or from the start with <b>Trail Memory</b>). The tamer walks to enemies, uses stairs and picks up drops by itself.',
        '<b>Auto Challenge</b> (Sanctuary, one stage per map): when the kill goal is reached, the Guardian is challenged by itself. Turn it on with the button next to Auto-hunt; it starts off every time you enter a map, and after a defeat it waits 20 s before trying again.',
      ]],
      ['Rebirth and Sanctuary', [
        'After the first Guardian you can be reborn: you start over and earn <b>Echoes</b> (more for each Guardian beaten and for a high tamer level).',
        'The <b>Sanctuary</b> tab shows your Echoes and how many you would earn by being reborn now. To buy permanent upgrades and automatic attributes, or to be reborn, talk to the <b>Sanctuary of Echoes</b> in Daybreak Village.',
        'You lose Glimmers, levels, Lumes, materials, coins, village upgrades and lanterns, Guardian items and maps. You keep Echoes, the Sanctuary, achievements, visual cloaks and the Bestiary.',
      ]],
      ['Achievements and Bestiary', [
        'Achievements give capture lanterns, Lumes, Echoes, bonuses against creatures, cloaks, special lanterns, titles and even Radiant Glimmers. Claim them at the trophy. They last forever.',
        'Any capture has a small chance (<b>0.5%</b>) of being a <b>Radiant</b> (+30% health and attack, +10% speed, golden glow). Radiants found this way don’t come back with Keeper Iris: only achievement Radiants do.',
        'The Bestiary records every form you have met and where it lives.',
      ]],
      ['Away from the game', [
        'Your Glimmers keep hunting while you are away (up to the Campsite limit, upgradable with Master Anvil). When you return you see what they earned.',
        'Away from the game they earn an average for the depth you are in, based on the damage of the Glimmers in your team (without the tamer, skills or special attacks): about half of what you get hunting actively. In the village and the Training Ground there is no hunting, so nothing is earned.',
        'After a few idle minutes the rest screen appears (adjust it in Settings).',
      ]],
      ['Saves, language and updates', [
        '3 save slots. Progress stays on this device; to take it to another, use Settings › Transfer progress.',
        'Change the language in Settings. The app installed from the website updates itself.',
      ]],
    ];
    return [
      ['Primeiros passos', [
        'Você é um Domador de Lume e desce pelas profundezas de Lumevale com suas <b>Centelhas</b>. Elas lutam sozinhas perto de você.',
        'Derrote criaturas para ganhar XP, <b>Lumes</b> (◆, gotas de Lume cristalizado, a moeda principal) e materiais.',
        'Capture criaturas selvagens com a lanterna para aumentar sua equipe.',
        'Cada mapa tem um <b>Guardião</b>. Vencê-lo abre o próximo mapa, mais fundo.',
      ]],
      ['Controles', movel ? [
        '<b>◀ ▶</b> andar · <b>▲</b> pular ou subir escada · <b>▼</b> descer escada ou atravessar plataforma.',
        'Toque no cenário para ir até lá. <b>Toque numa criatura</b>: só o domador ataca. <b>Segure o dedo</b> nela: o domador e as Centelhas atacam juntos.',
        'Escadas: pule e caia em cima de uma escada para subir por ela. Andando de lado ou descendo, você passa direto.',
        'Lanterna (canto de baixo): captura. Livro: Diário. Olho: Bestiário. Troféu: Conquistas. Engrenagem: Configurações.',
        'O botão ao lado das Centelhas troca o modo delas.',
      ] : [
        '<b>A/D</b> ou setas: andar · <b>Espaço</b>: pular · <b>W/S</b>: escadas e atravessar plataformas.',
        'Clique no cenário para ir até lá. <b>Clique esquerdo</b> numa criatura: só o domador ataca. <b>Clique direito</b>: o domador e as Centelhas atacam juntos.',
        'Escadas: pule e caia em cima de uma escada para subir por ela. Andando de lado ou descendo, você passa direto.',
        '<b>Q</b>: lanterna (captura) · <b>1, 2, 3</b>: modo das Centelhas · <b>4 a 8</b>: skills do domador · <b>O</b>: Bestiário · <b>C</b>: Conquistas · <b>Esc</b>: Configurações.',
        'Abas do Diário: <b>E</b> Equipe · <b>T</b> Domador · <b>M</b> Mapas · <b>R</b> Santuário · <b>B</b> Bolsa · <b>H</b> Ajuda. Apertar a mesma tecla de novo fecha.',
      ]],
      ['Centelhas em campo', [
        'Até 3 Centelhas lutam com você (mais com <b>Laço Extra</b>, do Mestre Bigorna, e <b>Vínculo Eterno</b> no Santuário). As outras ficam na Coleção: arraste até uma vaga livre.',
        'Modos: <b>Agressivo</b> ataca tudo por perto, <b>Defensor</b> só quem atacar primeiro, <b>Passivo</b> não ataca.',
        'Centelha sem vida desmaia e volta em 10 s.',
        'As Centelhas só passam ' + LV.F.capPet(0) + ' níveis acima do domador.',
      ]],
      ['Elementos', elementos(false).concat(['O elemento aparece ao lado do nome da Centelha. Use elementos fortes contra as criaturas de cada mapa.'])],
      ['Captura', [
        (movel ? 'Toque' : 'Clique') + ' na lanterna' + (movel ? '' : ' (ou aperte Q)') + ': o jogo pausa e as criaturas selvagens mostram a chance. Depois escolha uma.',
        'A chance é sorteada quando a lanterna acerta. Com vida cheia é cerca de <b>30%</b> nas primeiras áreas e menor em criaturas de nível alto. <b>Quanto menos vida, maior a chance</b> (até uns 85%).',
        'Se prender, vem o minijogo: feche a lanterna' + (movel ? '' : ' (clique ou <b>Espaço</b>)') + ' com o ponteiro na faixa clara, em até 5 s. No <b>centro dourado</b> a Centelha pode ganhar um talento (Feroz, Robusto ou Ágil).',
        'Criaturas mansas só revidam; as agressivas atacam quem chega perto do ninho. Os <b>Breus</b> (escuridão completa, sem nenhuma luz dentro) não podem ser capturados e atacam sempre. Cada mapa tem os seus Breus, e os ninhos misturam vários tipos.',
        'Lanternas são compradas com o <b>Mestre Pavio</b>, na Vila de Alvorada.',
      ]],
      ['Evolução e habilidades', [
        'Cada espécie tem 3 formas. Para evoluir: nível <b>' + evo[0] + '</b> (depois <b>' + evo[1] + '</b>), materiais e Lumes. O selo dourado ▲ mostra quem já pode evoluir.',
        'Cada espécie tem uma <b>especialidade</b>, que aparece no detalhe da Centelha: <b>Dano</b> (alvo único), <b>Área</b>, <b>Suporte</b> (cura e fortalecimentos), <b>Controle</b> (prende, atordoa, deixa lento) ou <b>Tanque</b> (vida, atrai inimigos e protege o grupo). Ela muda um pouco a vida e o ataque.',
        'Cada espécie tem <b>5 ataques especiais</b>, que misturam a especialidade com fortalecimentos da própria Centelha, do grupo, controle e dano bruto. O 1º vem de início; os outros se liberam no nível <b>25</b>, no nível <b>40</b> depois da 1ª evolução, no nível <b>55</b> e no nível <b>65</b> depois da 2ª evolução.',
        'Até <b>2 ataques</b> ficam equipados, cada um com a sua recarga. Escolha no detalhe da Centelha (aba Equipe). Melhorar (até o nível 10) deixa todos mais fortes.',
      ]],
      ['Domador e atributos', [
        'Cada nível do domador dá 3 pontos: <b>Força</b> (dano), <b>Vigor</b> (vida), <b>Sorte</b> (captura, coleta e crítico) e <b>Vínculo</b> (XP das Centelhas e velocidade de ataque).',
        'Cada nível do domador também dá +1% de dano e vida a todas as Centelhas.',
        'A aba <b>Domador</b> mostra os dados e os bônus atuais do domador; embaixo ficam os menus <b>Status</b>, <b>Skills</b>, <b>Capas</b> e <b>Lanternas</b> (só um abre de cada vez).',
        'Em Status, o botão no alto escolhe quantos pontos cada <b>+</b> adiciona: 1, 5, 10 ou 100 (com menos pontos livres, adiciona todos).',
      ]],
      ['Skills do domador', [
        'A cada <b>3 níveis</b> do domador você ganha <b>1 ponto de skill</b>. Liberar uma skill custa 1 ponto; os níveis seguintes custam 1 (até o 4), 2 (até o 7) e 3 (até o 10). Ao renascer, as skills voltam a zero.',
        '<b>Brado de Comando</b> (nível 5): mais dano para todas as Centelhas · <b>Olhar Certeiro</b> (nível 15): mais chance de captura da lanterna · <b>Ritmo do Lume</b> (nível 25): as Centelhas atacam mais rápido e recarregam os ataques especiais mais rápido · <b>Manto de Luz</b> (nível 30): cura o grupo e reduz o dano recebido · <b>Colheita Dourada</b> (nível 40): puxa tudo o que caiu e dá mais Lumes, materiais e XP.',
        'Use pelos botões redondos ' + (movel ? 'acima dos controles' : 'no canto de baixo da tela (ou pelas teclas <b>4 a 8</b>)') + '. Cada uma dura alguns segundos e depois recarrega.',
      ]],
      ['Perfil e títulos', [
        (movel ? 'Toque' : 'Clique') + ' no retrato do domador, na aba Domador, para abrir o <b>Perfil</b>: nome, aparência, título e os seus números (inimigos abatidos, Centelhas capturadas, renascimentos e mais).',
        'Os <b>títulos</b> saem das conquistas (ao resgatar a recompensa) e cada um dá um bônus: mais XP, dano, chance de captura, chance de Centelhas Radiantes, menos dano de criaturas de brasa, mais Ecos. Quanto mais difícil a conquista, maior o bônus. Equipe um no Perfil; sem título, aparece a patente do nível embaixo do nome.',
      ]],
      ['Capas e lanternas', [
        'Na aba <b>Domador</b> (menus Capas e Lanternas) você escolhe a capa e a lanterna do domador. Os itens trancados mostram como liberar.',
        '<b>Capas comuns</b> são só visuais e ficam para sempre: saem das conquistas ou da Dona Agulha, a costureira da vila (compra única).',
        'As <b>lanternas</b> mudam o golpe da lanterna: feixe de cristal que atravessa, explosão de brasa, maré que deixa lento, sombra que enfraquece ou cura para o grupo todo (a Lanterna de Cura não ataca). As das conquistas ficam para sempre; as compradas na vila valem até renascer. Cada lanterna dispara um tiro próprio.',
        'Cada <b>Guardião</b> deixa um item temático na primeira vitória de cada jornada (uma capa ou lanterna com bônus de verdade). Ele já vem equipado e some ao renascer.',
      ]],
      ['Vila de Alvorada', [
        'A aventura começa na <b>Vila de Alvorada</b>; volte quando quiser pela aba <b>Mapas</b> (seção Alvorada, no topo). A <b>placa de saída</b>, na ponta direita da vila, leva às Raízes Murmurantes. Clique num morador para ir até ele e conversar. Na vila só vão o domador e a Centelha da primeira vaga.',
        '<b>Mestre Pavio</b> vende lanternas de captura e especiais · <b>Dona Agulha</b> vende capas · <b>Mestre Bigorna</b> vende melhorias por Lumes e moedas dos Guardiões (cada Guardião solta a sua) · <b>Velho Escambo</b> troca materiais de profundezas vizinhas (5 por 1 para baixo, 1 por 2 para cima) · <b>Zeladora Íris</b> traz de volta os Radiantes das conquistas que você perdeu ao renascer (50.000 Lumes cada) · o <b>Santuário dos Ecos</b> vende as melhorias permanentes e é onde você renasce.',
        'As melhorias e as lanternas compradas na vila se perdem ao renascer.',
      ]],
      ['Campo de Treino', [
        'Pelo portão da vila (ou pela aba Mapas) você chega ao <b>Campo de Treino</b>: três bonecos que nunca caem e um medidor de <b>dano por segundo</b> no alto da tela, separado por domador e Centelha. O portal à esquerda leva de volta à vila.',
        'As Centelhas seguem o modo de comando: <b>Agressivo</b> ataca os bonecos, <b>Defensor</b> só o boneco que você bater, <b>Passivo</b> não ataca. Use para comparar ataques, especialidades, skills e lanternas. Lá não se ganha nem se perde nada.',
      ]],
      ['Guardiões e mapas', [
        'Derrote criaturas do mapa até a meta (' + metas + ') e toque em <b>Desafiar Guardião</b>.',
        'A luta dura 60 s e acaba se todas as Centelhas desmaiarem. Durante o desafio, o domador e as Centelhas atacam o Guardião sozinhos (Centelhas no modo <b>Passivo</b> ficam de fora, a não ser que você mande com o clique direito ou o toque longo).',
        'A meta é sempre a mesma. Depois dela, 10% dos abates ficam guardados para a próxima invocação.',
        'Cada Guardião tem um ataque básico e dois especiais do seu tema: raízes, gás venenoso, âncora e água, luz, correntes e fogo. Os especiais são avisados antes: círculos e faixas no chão mostram onde vão cair. Alguns envenenam, prendem ou atordoam as Centelhas.',
        'A primeira vitória abre o próximo mapa, dá uma Centelha nova e um item temático (capa ou lanterna). Na aba Mapas, toque num mapa para ver a prévia e viajar (o jogo pausa enquanto a prévia está aberta).',
      ]],
      ['Caçada automática', [
        'Liberada depois do primeiro Guardião (ou desde o início com <b>Memória da Trilha</b>). O domador anda sozinho até os inimigos, usa escadas e coleta o que cai.',
        '<b>Desafio Automático</b> (Santuário, uma etapa por mapa): ao completar a meta de abates, o Guardião é desafiado sozinho. Ligue no botão ao lado da Caçada Auto; ele começa desligado sempre que você entra num mapa e, depois de uma derrota, espera 20 s antes de tentar de novo.',
      ]],
      ['Renascer e Santuário', [
        'Depois do primeiro Guardião você pode renascer: volta ao começo e ganha <b>Ecos</b> (mais Ecos a cada Guardião vencido e com o domador em nível alto).',
        'A aba <b>Santuário</b> mostra os seus Ecos e quantos você ganharia renascendo agora. Para comprar melhorias permanentes e atributos automáticos, ou para renascer, fale com o <b>Santuário dos Ecos</b>, na Vila de Alvorada.',
        'Você perde Centelhas, níveis, Lumes, materiais, moedas, melhorias e lanternas da vila, itens dos Guardiões e mapas. Ficam os Ecos, o Santuário, as conquistas, as capas visuais e o Bestiário.',
      ]],
      ['Conquistas e Bestiário', [
        'Conquistas dão lanternas de captura, Lumes, Ecos, bônus contra criaturas, capas, lanternas especiais, títulos e até Centelhas Radiantes. Resgate no troféu. Valem para sempre.',
        'Toda captura tem uma chance pequena (<b>0,5%</b>) de vir <b>Radiante</b> (+30% de vida e ataque, +10% de velocidade e brilho dourado). As Radiantes encontradas assim não voltam pela Zeladora Íris: só as das conquistas.',
        'O Bestiário registra cada forma que você encontrou e onde ela vive.',
      ]],
      ['Fora do jogo', [
        'Suas Centelhas continuam caçando enquanto você está fora (até o limite do Acampamento, que melhora com o Mestre Bigorna). Na volta, você vê o que elas ganharam.',
        'Fora do jogo, elas rendem uma média da profundeza em que você está, calculada pelo dano das Centelhas da equipe (sem o domador, skills nem ataques especiais): cerca de metade do que se ganha caçando ativamente. Na vila e no Campo de Treino não há caçada, então nada é ganho.',
        'Parado por alguns minutos, aparece a tela de descanso (ajuste em Configurações).',
      ]],
      ['Saves, idioma e atualizações', [
        '3 espaços de save. O progresso fica neste aparelho; para levar a outro, use Configurações › Levar o progresso.',
        'O idioma fica em Configurações. O app instalado pelo site se atualiza sozinho.',
      ]],
    ];
  };
})();
