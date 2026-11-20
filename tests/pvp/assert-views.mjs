import assert from 'node:assert/strict';

// Independent allowlist: public defender commitments and explicit public reveals
// are exceptions, not permission to expose the rest of an opposing hand.
export function assertPrivacy(v) {
  const publicCards = new Set(v.state.activeBattle?.defender===1 ? v.state.activeBattle.blockers : []);
  const p=v.presentation;
  if(p) {
    if(['onAbilityActivated','onAbilityResolved','onCardCalled','onCheckRevealed','onCheckCardPlaced','onCheckResolved','onPersonify','onSentryRevealed','onTokenCreated','onCheckCardToHand'].includes(p.hook)) publicCards.add(p.args[0]);
    if(['onAttackDeclared','onBlockingStart','onBlockersDeclared','onAttackResolved'].includes(p.hook)) for(const uid of p.args[0].blockers)publicCards.add(uid);
    if(p.hook==='onFx') {
      const fx=p.args[0];
      if(fx.kind==='heartMove'||fx.kind==='handMove')for(const card of fx.cards)if(!card.hidden)publicCards.add(card.uid);
      if('uid' in fx && (fx.kind!=='emit'||fx.faceUp))publicCards.add(fx.uid);
    }
  }
  for(const uid of v.state.players[1].hand) if(!publicCards.has(uid))assert.equal(v.state.cards[uid].defId,'__hidden__',`concealed hand ${uid}`);
  for(const player of v.state.players)for(const uid of [...player.deck,...player.barriers])assert.equal(v.state.cards[uid].defId,'__hidden__');
  assert.equal(v.state.rngSeed,0);
}

export function assertAgreement(a,b) {
  assert.equal(a.revision,b.revision);
  assert.equal(a.state.phase,b.state.phase);assert.equal(a.state.turnNumber,b.state.turnNumber);
  assert.equal(a.state.turnPlayer,1-b.state.turnPlayer);
  for(let i=0;i<2;i++) {
    const own=a.state.players[i],peer=b.state.players[1-i];
    for(const pile of ['hand','deck','barriers','heart','grave','exile','codex'])assert.equal(own[pile].length,peer[pile].length,`${pile} count`);
    assert.deepEqual(own.allies,peer.allies);assert.equal(own.persona,peer.persona);
    for(const uid of [...own.allies,own.persona].filter(Boolean))assert.equal(a.state.cards[uid].defId,b.state.cards[uid].defId);
  }
}
