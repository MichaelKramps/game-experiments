// ── Data ──────────────────────────────────────────────────────────────────────

const BOSSES = [
  {
    name: 'Goblin Warchief',
    power: 4,
    perCard: 0,
    ability: 'none',
    abilityDesc: 'No tricks. Just brute force.',
    sprite: `<svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="116" rx="22" ry="4" fill="#000" opacity="0.35"/>
      <path d="M36 88 L30 112" stroke="#1e4010" stroke-width="10" stroke-linecap="round"/>
      <path d="M64 88 L70 112" stroke="#1e4010" stroke-width="10" stroke-linecap="round"/>
      <ellipse cx="50" cy="72" rx="22" ry="24" fill="#2d6018"/>
      <path d="M29 70 L10 55" stroke="#2d6018" stroke-width="9" stroke-linecap="round"/>
      <ellipse cx="7" cy="51" rx="10" ry="7" fill="#7a5528"/>
      <path d="M71 70 L84 60" stroke="#2d6018" stroke-width="9" stroke-linecap="round"/>
      <ellipse cx="50" cy="46" rx="22" ry="20" fill="#3a7820"/>
      <polygon points="28,42 16,22 33,39" fill="#3a7820"/>
      <polygon points="72,42 84,22 67,39" fill="#3a7820"/>
      <path d="M30,34 L30,26 L36,32 L40,22 L44,32 L50,20 L56,32 L60,22 L64,32 L70,26 L70,34 Z" fill="#c9a84c"/>
      <rect x="30" y="32" width="40" height="6" rx="2" fill="#a08030"/>
      <circle cx="40" cy="47" r="5.5" fill="#cc2200"/>
      <circle cx="60" cy="47" r="5.5" fill="#cc2200"/>
      <circle cx="40" cy="47" r="2.5" fill="#220000"/>
      <circle cx="60" cy="47" r="2.5" fill="#220000"/>
      <ellipse cx="50" cy="55" rx="5" ry="3.5" fill="#2d6018"/>
      <circle cx="47" cy="56" r="1.5" fill="#1a4010"/>
      <circle cx="53" cy="56" r="1.5" fill="#1a4010"/>
      <path d="M42,62 L40,72" stroke="#e8e870" stroke-width="3" stroke-linecap="round"/>
      <path d="M58,62 L60,72" stroke="#e8e870" stroke-width="3" stroke-linecap="round"/>
      <path d="M43,64 Q50,69 57,64" stroke="#1a3a08" stroke-width="2" fill="none"/>
    </svg>`,
  },
  {
    name: 'Stone Troll',
    power: 3,
    perCard: 1,
    ability: 'thick-hide',
    abilityDesc: 'Thick Hide — Your lowest-power card is nullified.',
    sprite: `<svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="116" rx="30" ry="4" fill="#000" opacity="0.4"/>
      <path d="M30 96 L22 114" stroke="#3a3028" stroke-width="13" stroke-linecap="round"/>
      <path d="M70 96 L78 114" stroke="#3a3028" stroke-width="13" stroke-linecap="round"/>
      <rect x="14" y="54" width="72" height="50" rx="10" fill="#4a4038"/>
      <path d="M10 72 L2 60" stroke="#4a4038" stroke-width="14" stroke-linecap="round"/>
      <ellipse cx="1" cy="55" rx="11" ry="9" fill="#5a5048"/>
      <path d="M90 72 L98 60" stroke="#4a4038" stroke-width="14" stroke-linecap="round"/>
      <ellipse cx="99" cy="55" rx="11" ry="9" fill="#5a5048"/>
      <ellipse cx="50" cy="48" rx="28" ry="24" fill="#5a5048"/>
      <polygon points="22,46 18,30 28,44" fill="#5a5048"/>
      <polygon points="78,46 82,30 72,44" fill="#5a5048"/>
      <polygon points="30,26 26,14 36,28" fill="#6a6058"/>
      <polygon points="50,22 48,10 54,24" fill="#6a6058"/>
      <polygon points="70,26 74,14 64,28" fill="#6a6058"/>
      <circle cx="38" cy="50" r="6" fill="#2a2820"/>
      <circle cx="62" cy="50" r="6" fill="#2a2820"/>
      <circle cx="38" cy="50" r="3" fill="#111"/>
      <circle cx="62" cy="50" r="3" fill="#111"/>
      <path d="M36,62 L40,68 L46,62 L50,70 L54,62 L60,68 L64,62" stroke="#2a2820" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
      <path d="M24,58 Q22,54 26,52" stroke="#6a6058" stroke-width="2" stroke-linecap="round"/>
      <path d="M76,58 Q78,54 74,52" stroke="#6a6058" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    name: 'Plague Witch',
    power: 6,
    perCard: 1,
    ability: 'hex',
    abilityDesc: 'Hex — Your 2 lowest-power cards are nullified.',
    sprite: `<svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="116" rx="20" ry="4" fill="#000" opacity="0.35"/>
      <path d="M38 95 Q34 108 30 116" stroke="#2a1a3a" stroke-width="7" stroke-linecap="round"/>
      <path d="M62 95 Q66 108 70 116" stroke="#2a1a3a" stroke-width="7" stroke-linecap="round"/>
      <path d="M28 60 Q20 80 24 100 Q36 108 50 108 Q64 108 76 100 Q80 80 72 60 Z" fill="#2a1a3a"/>
      <path d="M28 60 Q24 52 30 48" stroke="#2a1a3a" stroke-width="5" stroke-linecap="round"/>
      <path d="M72 60 Q76 52 70 48" stroke="#2a1a3a" stroke-width="5" stroke-linecap="round"/>
      <path d="M26 46 L18 22 L50 38 L82 22 L74 46 Z" fill="#1a0e28"/>
      <path d="M34 38 L28 14 L50 32 L72 14 L66 38" fill="#221632"/>
      <path d="M38 30 L34 8 L50 26 L66 8 L62 30" fill="#1a0e28"/>
      <ellipse cx="50" cy="48" rx="18" ry="16" fill="#2a1a3a"/>
      <ellipse cx="50" cy="45" rx="12" ry="10" fill="#1e1228"/>
      <circle cx="42" cy="44" r="4.5" fill="#44bb22"/>
      <circle cx="58" cy="44" r="4.5" fill="#44bb22"/>
      <circle cx="42" cy="44" r="2" fill="#88ff44"/>
      <circle cx="58" cy="44" r="2" fill="#88ff44"/>
      <path d="M44,56 Q50,60 56,56" stroke="#1a0e28" stroke-width="2" fill="none"/>
      <path d="M78 78 L90 68 Q96 64 92 72 L86 82 Z" fill="#3a2050" stroke="#5a3080" stroke-width="1"/>
      <circle cx="90" cy="67" r="8" fill="#1a0e28" stroke="#5a30aa" stroke-width="1.5"/>
      <circle cx="90" cy="67" r="5" fill="#2a1044"/>
      <circle cx="90" cy="67" r="3" fill="#aa44ff" opacity="0.8"/>
      <circle cx="89" cy="66" r="1.5" fill="#dd88ff"/>
      <circle cx="75" cy="72" r="2" fill="#88ff44" opacity="0.6"/>
      <circle cx="82" cy="62" r="1.5" fill="#aa44ff" opacity="0.5"/>
      <circle cx="88" cy="78" r="1" fill="#88ff44" opacity="0.7"/>
    </svg>`,
  },
  {
    name: 'Iron Sentinel',
    power: 6,
    perCard: 2,
    ability: 'cull',
    abilityDesc: 'Cull — Only your 5 highest-power cards count.',
    sprite: `<svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="116" rx="26" ry="4" fill="#000" opacity="0.4"/>
      <rect x="32" y="86" width="14" height="28" rx="4" fill="#2a3a4a"/>
      <rect x="54" y="86" width="14" height="28" rx="4" fill="#2a3a4a"/>
      <rect x="28" y="54" width="44" height="40" rx="6" fill="#3a4a5a"/>
      <rect x="30" y="56" width="40" height="36" rx="4" fill="#2a3848" stroke="#4a6a8a" stroke-width="1"/>
      <line x1="50" y1="56" x2="50" y2="92" stroke="#4a6a8a" stroke-width="1" opacity="0.5"/>
      <line x1="30" y1="74" x2="70" y2="74" stroke="#4a6a8a" stroke-width="1" opacity="0.5"/>
      <path d="M14 62 L4 70 L4 90 L14 86 Z" fill="#3a4a5a" stroke="#4a6a8a" stroke-width="1"/>
      <path d="M86 62 L96 70 L96 90 L86 86 Z" fill="#3a4a5a" stroke="#4a6a8a" stroke-width="1"/>
      <rect x="22" y="42" width="56" height="20" rx="4" fill="#4a5a6a"/>
      <rect x="24" y="44" width="52" height="16" rx="3" fill="#3a4858" stroke="#5a7a9a" stroke-width="1"/>
      <rect x="30" y="28" width="40" height="18" rx="8" fill="#3a4a5a"/>
      <rect x="32" y="30" width="36" height="14" rx="6" fill="#2a3848" stroke="#4a6a8a" stroke-width="1"/>
      <polygon points="38,18 42,8 50,4 58,8 62,18 50,16 Z" fill="#2a3848" stroke="#4a6a8a" stroke-width="1"/>
      <rect x="36" y="48" width="28" height="8" rx="2" fill="#0a1020"/>
      <rect x="38" y="49" width="24" height="6" rx="1.5" fill="#002244"/>
      <rect x="38" y="50" width="24" height="4" rx="1" fill="#0066cc" opacity="0.8"/>
      <line x1="50" y1="50" x2="50" y2="54" stroke="#44aaff" stroke-width="1.5"/>
      <rect x="44" y="50" width="12" height="4" rx="1" fill="#44aaff" opacity="0.4"/>
      <rect x="46" y="96" width="8" height="20" rx="2" fill="#4a5a6a"/>
      <rect x="47" y="82" width="6" height="16" rx="2" fill="#3a4a5a"/>
    </svg>`,
  },
  {
    name: 'Ancient Dragon',
    power: 9,
    perCard: 3,
    ability: 'dragons-gaze',
    abilityDesc: "Dragon's Gaze — Only your 6 highest-power cards count.",
    sprite: `<svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="116" rx="28" ry="4" fill="#000" opacity="0.4"/>
      <path d="M8 30 Q2 18 10 14 Q14 28 22 36 Q10 32 8 30 Z" fill="#6a1010"/>
      <path d="M92 30 Q98 18 90 14 Q86 28 78 36 Q90 32 92 30 Z" fill="#6a1010"/>
      <path d="M8 30 Q16 18 30 24 Q40 28 44 42 Q36 40 28 44 Q16 40 8 30 Z" fill="#8a1818"/>
      <path d="M92 30 Q84 18 70 24 Q60 28 56 42 Q64 40 72 44 Q84 40 92 30 Z" fill="#8a1818"/>
      <path d="M20 54 Q14 62 16 78 Q22 90 30 94 Q40 96 50 96 Q60 96 70 94 Q78 90 84 78 Q86 62 80 54 Q72 44 50 42 Q28 44 20 54 Z" fill="#7a1414"/>
      <path d="M22 56 Q18 64 20 78 Q26 88 50 90 Q74 88 80 78 Q82 64 78 56 Q70 48 50 46 Q30 48 22 56 Z" fill="#8a1c1c" stroke="#aa2424" stroke-width="0.5"/>
      <path d="M30 68 Q32 64 36 66 Q38 70 34 72 Z" fill="#aa3030"/>
      <path d="M48 64 Q50 60 54 62 Q56 66 50 68 Z" fill="#aa3030"/>
      <path d="M66 68 Q68 64 72 66 Q74 70 70 72 Z" fill="#aa3030"/>
      <path d="M36 78 Q42 76 50 78 Q58 76 64 78 Q58 84 50 84 Q42 84 36 78 Z" fill="#6a1010"/>
      <ellipse cx="36" cy="52" rx="7" ry="6" fill="#5a1010"/>
      <ellipse cx="64" cy="52" rx="7" ry="6" fill="#5a1010"/>
      <circle cx="36" cy="51" r="4.5" fill="#c9a84c"/>
      <circle cx="64" cy="51" r="4.5" fill="#c9a84c"/>
      <ellipse cx="36" cy="51" rx="2" ry="4" fill="#1a0808"/>
      <ellipse cx="64" cy="51" rx="2" ry="4" fill="#1a0808"/>
      <polygon points="38,40 34,28 42,38" fill="#6a1010"/>
      <polygon points="50,36 48,22 52,36" fill="#8a1818"/>
      <polygon points="62,40 66,28 58,38" fill="#6a1010"/>
      <path d="M34 82 Q28 96 24 108 Q32 106 38 96 Q42 106 50 108 Q58 106 62 96 Q68 106 76 108 Q72 96 66 82" fill="#6a1010" stroke="#8a1818" stroke-width="1"/>
      <path d="M44 88 Q46 82 50 86 Q52 90 50 94 Q48 90 44 88 Z" fill="#ff4400" opacity="0.7"/>
      <path d="M48 86 Q50 78 52 84 Q54 88 50 92 Z" fill="#ff8800" opacity="0.6"/>
      <circle cx="50" cy="80" r="3" fill="#ffaa00" opacity="0.4"/>
    </svg>`,
  },
];

// ── Card pool ────────────────────────────────────────────────────────────────
// Each card: { id, name, tier, power, ability, abilityDesc }
// ability values and their timing:
//   'none'           — no effect
//   'purge'          — on-buy: remove a Minion from deck
//   'severance'      — on-remove: gain 1 gold
//   'redirect'       — in-battle: if negated, transfer power to an active card
//   'double-strike'  — in-battle: attacks twice
//   'empower'        — in-battle: on attack, permanently give a random card +1 power
//   'buy-boost'      — on-buy: give a random deck card +2 power
//   'triple-strike'  — in-battle: attacks 3 times
//   'war-cry'        — in-battle: on attack, all subsequent cards get +1 power this battle
//   'martyr'         — on-remove: all other deck cards gain +1 power permanently
//   'recruit'        — passive: gain +1 power whenever any card is bought
//   'scavenge'       — passive: gain +1 power whenever any other card is removed
//   'soul-collect'   — in-battle: power equals total of all nullified cards
//   'heirloom'       — on-remove: give this card's full power to a random other deck card
//   'duelist'        — in-battle: power equals the number of cards in your deck
//   'alchemy'        — on-remove: gain gold equal to this card's power
//   'immune'         — in-battle: never nullified by boss abilities
//   'colossus'       — in-battle: power equals the total of all other non-nullified cards
//   'inspire'        — in-battle: all other effective cards gain +1 power for the whole battle
//   'undying'        — on-remove: return to your deck at power 1

const SPRITES = {
  'iron-fist': `<svg viewBox="0 0 40 40" fill="none"><rect x="14" y="22" width="12" height="10" rx="2" fill="#8a8a8a"/><rect x="13" y="16" width="14" height="8" rx="1" fill="#9e9e9e"/><rect x="15" y="10" width="4" height="8" rx="1" fill="#7a7a7a"/><rect x="19" y="11" width="4" height="7" rx="1" fill="#7a7a7a"/><rect x="23" y="12" width="3" height="6" rx="1" fill="#7a7a7a"/><rect x="12" y="17" width="3" height="6" rx="1" fill="#7a7a7a"/><rect x="13" y="30" width="14" height="3" rx="1" fill="#c0a060"/><line x1="20" y1="4" x2="20" y2="10" stroke="#c0a060" stroke-width="2"/><polygon points="20,2 22,6 18,6" fill="#c0a060"/></svg>`,
  'sellsword': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="7" r="4" fill="#c8a87a"/><rect x="17" y="11" width="6" height="14" rx="1" fill="#8b6914"/><line x1="26" y1="10" x2="32" y2="22" stroke="#b0b0b0" stroke-width="2.5" stroke-linecap="round"/><rect x="24" y="8" width="6" height="2" rx="1" fill="#888"/><line x1="14" y1="25" x2="10" y2="32" stroke="#8b6914" stroke-width="2" stroke-linecap="round"/><line x1="26" y1="25" x2="30" y2="32" stroke="#8b6914" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="28" r="4" fill="#f0c030" stroke="#c09000" stroke-width="1"/><line x1="8" y1="28" x2="12" y2="28" stroke="#c09000" stroke-width="1"/><line x1="10" y1="26" x2="10" y2="30" stroke="#c09000" stroke-width="1"/></svg>`,
  'ghost-blade': `<svg viewBox="0 0 40 40" fill="none"><line x1="10" y1="30" x2="28" y2="8" stroke="#ddeeff" stroke-width="3" stroke-linecap="round" opacity="0.9"/><line x1="10" y1="30" x2="28" y2="8" stroke="#aaccff" stroke-width="6" stroke-linecap="round" opacity="0.3"/><rect x="7" y="27" width="8" height="3" rx="1" fill="#99bbdd" transform="rotate(-45 11 28.5)"/><rect x="26" y="5" width="4" height="4" rx="1" fill="#cce0ff"/><ellipse cx="20" cy="20" rx="6" ry="12" fill="#aaccff" opacity="0.15" transform="rotate(-45 20 20)"/><circle cx="18" cy="22" r="2" fill="#cce0ff" opacity="0.5"/><circle cx="22" cy="17" r="1.5" fill="#eef4ff" opacity="0.6"/></svg>`,
  'eager-recruit': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="7" r="4" fill="#d4a870"/><rect x="17" y="11" width="6" height="12" rx="1" fill="#6b8c3a"/><line x1="14" y1="23" x2="11" y2="33" stroke="#6b8c3a" stroke-width="2.5" stroke-linecap="round"/><line x1="26" y1="23" x2="29" y2="33" stroke="#6b8c3a" stroke-width="2.5" stroke-linecap="round"/><line x1="26" y1="13" x2="26" y2="2" stroke="#a08040" stroke-width="2" stroke-linecap="round"/><line x1="23" y1="5" x2="29" y2="5" stroke="#a08040" stroke-width="1.5"/><polygon points="26,2 24,6 28,6" fill="#c0a050"/><circle cx="20" cy="6" r="4.5" fill="none" stroke="#7a7a7a" stroke-width="1.5"/></svg>`,
  'scavenger': `<svg viewBox="0 0 40 40" fill="none"><circle cx="19" cy="7" r="3.5" fill="#b89060"/><path d="M12 12 Q14 10 20 11 Q26 10 26 14 L24 26 L16 26 Z" fill="#4a3d2a"/><path d="M12 12 Q10 14 12 18 L14 26" stroke="#4a3d2a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M26 14 Q28 16 27 20 L25 26" stroke="#4a3d2a" stroke-width="3" fill="none" stroke-linecap="round"/><line x1="14" y1="26" x2="12" y2="35" stroke="#4a3d2a" stroke-width="2.5" stroke-linecap="round"/><line x1="24" y1="26" x2="22" y2="35" stroke="#4a3d2a" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="29" cy="30" rx="6" ry="5" fill="#6b5030" stroke="#8a6840" stroke-width="1"/><line x1="24" y1="28" x2="26" y2="32" stroke="#8a6840" stroke-width="1.5"/></svg>`,
  'soul-collector': `<svg viewBox="0 0 40 40" fill="none"><path d="M14 10 Q20 5 26 10 L28 30 Q24 35 20 36 Q16 35 12 30 Z" fill="#2a1a3a"/><path d="M14 10 Q20 5 26 10 L28 30 Q24 35 20 36 Q16 35 12 30 Z" stroke="#6a3a9a" stroke-width="1"/><ellipse cx="17" cy="18" rx="2" ry="3" fill="#22ff88" opacity="0.9"/><ellipse cx="23" cy="18" rx="2" ry="3" fill="#22ff88" opacity="0.9"/><ellipse cx="20" cy="23" rx="1.5" ry="2" fill="#22ff88" opacity="0.7"/><circle cx="17" cy="17" r="1" fill="#aaffcc"/><circle cx="23" cy="17" r="1" fill="#aaffcc"/><ellipse cx="13" cy="17" rx="3" ry="4" fill="#44eeaa" opacity="0.5"/><ellipse cx="27" cy="17" rx="3" ry="4" fill="#8833cc" opacity="0.5"/><path d="M12 30 L10 38 L14 36 L16 38 L18 36 L20 38 L22 36 L24 38 L26 36 L28 38 L28 30" fill="#2a1a3a"/></svg>`,
  'blood-pact': `<svg viewBox="0 0 40 40" fill="none"><rect x="8" y="6" width="24" height="28" rx="2" fill="#d4c8a0" stroke="#a09060" stroke-width="1"/><rect x="8" y="6" width="24" height="8" rx="2" fill="#c0b48c"/><line x1="12" y1="20" x2="28" y2="20" stroke="#a09060" stroke-width="1" opacity="0.6"/><line x1="12" y1="24" x2="28" y2="24" stroke="#a09060" stroke-width="1" opacity="0.6"/><line x1="12" y1="28" x2="22" y2="28" stroke="#a09060" stroke-width="1" opacity="0.6"/><circle cx="20" cy="30" r="5" fill="#cc1111" opacity="0.9"/><path d="M20 26 L21.5 29 L25 29.5 L22.5 32 L23 35 L20 33.5 L17 35 L17.5 32 L15 29.5 L18.5 29 Z" fill="#ff3333"/><circle cx="20" cy="30" r="2" fill="#880000"/></svg>`,
  'berserker': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="6" r="4" fill="#e8a060"/><rect x="17" y="10" width="6" height="11" rx="1" fill="#3a6888"/><line x1="17" y1="21" x2="12" y2="33" stroke="#3a6888" stroke-width="2.5" stroke-linecap="round"/><line x1="23" y1="21" x2="28" y2="33" stroke="#3a6888" stroke-width="2.5" stroke-linecap="round"/><line x1="6" y1="8" x2="17" y2="16" stroke="#88aacc" stroke-width="2.5" stroke-linecap="round"/><rect x="3" y="5" width="5" height="7" rx="1" fill="#6699bb" stroke="#88aacc" stroke-width="1"/><line x1="34" y1="8" x2="23" y2="16" stroke="#88aacc" stroke-width="2.5" stroke-linecap="round"/><rect x="32" y="5" width="5" height="7" rx="1" fill="#6699bb" stroke="#88aacc" stroke-width="1"/><path d="M16 10 Q20 8 24 10" stroke="#cc4444" stroke-width="1.5" fill="none"/></svg>`,
  'warlord': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="6" r="4" fill="#d09060"/><rect x="16" y="9" width="8" height="2" rx="1" fill="#667799" stroke="#aabbcc" stroke-width="0.5"/><rect x="14" y="10" width="12" height="12" rx="1" fill="#4a5a7a"/><rect x="10" y="10" width="5" height="9" rx="1" fill="#3a4a6a"/><rect x="25" y="10" width="5" height="9" rx="1" fill="#3a4a6a"/><line x1="16" y1="22" x2="13" y2="34" stroke="#4a5a7a" stroke-width="2.5" stroke-linecap="round"/><line x1="24" y1="22" x2="27" y2="34" stroke="#4a5a7a" stroke-width="2.5" stroke-linecap="round"/><line x1="20" y1="10" x2="20" y2="2" stroke="#ccaa44" stroke-width="2.5" stroke-linecap="round"/><rect x="17" y="1" width="6" height="2" rx="1" fill="#ccaa44"/><polygon points="20,1 18,4 22,4" fill="#ffdd66"/></svg>`,
  'arms-dealer': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="6" r="3.5" fill="#c8a870"/><rect x="17" y="9" width="6" height="10" rx="1" fill="#7a5a3a"/><line x1="17" y1="19" x2="14" y2="30" stroke="#7a5a3a" stroke-width="2" stroke-linecap="round"/><line x1="23" y1="19" x2="26" y2="30" stroke="#7a5a3a" stroke-width="2" stroke-linecap="round"/><rect x="8" y="22" width="24" height="14" rx="2" fill="#5a3a1a" stroke="#8a6030" stroke-width="1.5"/><rect x="8" y="22" width="24" height="5" rx="2" fill="#6a4a2a"/><line x1="8" y1="27" x2="32" y2="27" stroke="#8a6030" stroke-width="1"/><line x1="12" y1="29" x2="12" y2="35" stroke="#aaaaaa" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="28" x2="22" y2="28" stroke="#ccaa44" stroke-width="2" stroke-linecap="round"/><line x1="26" y1="29" x2="28" y2="35" stroke="#aaaaaa" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  'duelist': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="5" r="3.5" fill="#d4b080"/><rect x="17" y="8" width="5" height="11" rx="1" fill="#3a7a8a" transform="rotate(5 19.5 13.5)"/><line x1="24" y1="19" x2="30" y2="33" stroke="#4a8a9a" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="19" x2="10" y2="30" stroke="#3a7a8a" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="8" x2="36" y2="38" stroke="#c0c8d0" stroke-width="1.5" stroke-linecap="round"/><rect x="25" y="6" width="6" height="2" rx="1" fill="#8899aa" transform="rotate(-10 28 7)"/><rect x="26" y="5" width="4" height="4" rx="0.5" fill="#8899aa" transform="rotate(-10 28 7)"/></svg>`,
  'alchemist': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="6" r="3.5" fill="#c0a880"/><rect x="17" y="9" width="6" height="12" rx="1" fill="#5a4a7a"/><line x1="17" y1="21" x2="14" y2="32" stroke="#5a4a7a" stroke-width="2.5" stroke-linecap="round"/><line x1="23" y1="21" x2="26" y2="32" stroke="#5a4a7a" stroke-width="2.5" stroke-linecap="round"/><line x1="28" y1="10" x2="28" y2="24" stroke="#8877aa" stroke-width="2" stroke-linecap="round"/><ellipse cx="28" cy="28" rx="5" ry="6" fill="#44ddaa" opacity="0.85"/><ellipse cx="28" cy="28" rx="5" ry="6" fill="none" stroke="#22ccaa" stroke-width="1.5"/><ellipse cx="28" cy="24" rx="3" ry="2" fill="#7a6a9a"/><circle cx="27" cy="27" r="1.5" fill="#88ffcc" opacity="0.8"/><circle cx="29" cy="30" r="1" fill="#aaffee" opacity="0.7"/></svg>`,
  'paladin': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="5" r="3.5" fill="#d4b888"/><rect x="17" y="8" width="6" height="2" rx="1" fill="#8899aa" stroke="#aabbcc" stroke-width="0.5"/><rect x="17" y="10" width="6" height="11" rx="1" fill="#5577aa"/><line x1="17" y1="21" x2="14" y2="33" stroke="#5577aa" stroke-width="2.5" stroke-linecap="round"/><line x1="23" y1="21" x2="26" y2="33" stroke="#5577aa" stroke-width="2.5" stroke-linecap="round"/><rect x="6" y="14" width="12" height="16" rx="2" fill="#4466aa" stroke="#6688cc" stroke-width="1.5"/><line x1="12" y1="16" x2="12" y2="28" stroke="#ffeeaa" stroke-width="1.5"/><line x1="7" y1="22" x2="17" y2="22" stroke="#ffeeaa" stroke-width="1.5"/><circle cx="12" cy="22" r="2" fill="#ffdd88" opacity="0.8"/></svg>`,
  'juggernaut': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="5" r="5" fill="#b88060"/><rect x="12" y="10" width="16" height="15" rx="1" fill="#4a3a6a"/><rect x="7" y="9" width="7" height="12" rx="1" fill="#3a2a5a"/><rect x="26" y="9" width="7" height="12" rx="1" fill="#3a2a5a"/><line x1="14" y1="25" x2="10" y2="38" stroke="#4a3a6a" stroke-width="4" stroke-linecap="round"/><line x1="26" y1="25" x2="30" y2="38" stroke="#4a3a6a" stroke-width="4" stroke-linecap="round"/><line x1="4" y1="6" x2="12" y2="14" stroke="#aa8844" stroke-width="3" stroke-linecap="round"/><rect x="1" y="3" width="5" height="8" rx="1" fill="#8866aa" stroke="#aa88cc" stroke-width="1"/><line x1="36" y1="6" x2="28" y2="14" stroke="#cc9944" stroke-width="3" stroke-linecap="round"/><line x1="34" y1="4" x2="38" y2="20" stroke="#99aacc" stroke-width="3" stroke-linecap="round"/></svg>`,
  'battle-mage': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="5" r="4" fill="#c09870"/><rect x="16" y="9" width="8" height="12" rx="1" fill="#5a3a7a"/><rect x="13" y="9" width="5" height="10" rx="1" fill="#4a2a6a"/><rect x="22" y="9" width="5" height="10" rx="1" fill="#4a2a6a"/><line x1="16" y1="21" x2="12" y2="34" stroke="#5a3a7a" stroke-width="2.5" stroke-linecap="round"/><line x1="24" y1="21" x2="28" y2="34" stroke="#5a3a7a" stroke-width="2.5" stroke-linecap="round"/><line x1="30" y1="2" x2="30" y2="30" stroke="#8855aa" stroke-width="2.5" stroke-linecap="round"/><circle cx="30" cy="4" r="4" fill="#ff8833" opacity="0.9"/><circle cx="30" cy="4" r="2.5" fill="#ffcc44"/><ellipse cx="30" cy="6" rx="5" ry="4" fill="#ff6622" opacity="0.4"/><circle cx="30" cy="3" r="1.5" fill="#ffffff" opacity="0.7"/></svg>`,
  'the-chosen': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="10" r="5" fill="#ffe888"/><rect x="17" y="15" width="6" height="13" rx="1" fill="#ddb844"/><rect x="13" y="15" width="5" height="11" rx="1" fill="#cc9933"/><rect x="22" y="15" width="5" height="11" rx="1" fill="#cc9933"/><line x1="17" y1="28" x2="14" y2="38" stroke="#cc9933" stroke-width="3" stroke-linecap="round"/><line x1="23" y1="28" x2="26" y2="38" stroke="#cc9933" stroke-width="3" stroke-linecap="round"/><line x1="20" y1="5" x2="20" y2="1" stroke="#ffee88" stroke-width="2"/><line x1="15" y1="10" x2="4" y2="8" stroke="#ffee88" stroke-width="1.5" opacity="0.8"/><line x1="25" y1="10" x2="36" y2="8" stroke="#ffee88" stroke-width="1.5" opacity="0.8"/><line x1="15" y1="14" x2="6" y2="18" stroke="#ffee88" stroke-width="1" opacity="0.6"/><line x1="25" y1="14" x2="34" y2="18" stroke="#ffee88" stroke-width="1" opacity="0.6"/><circle cx="20" cy="10" r="7" fill="none" stroke="#ffff88" stroke-width="0.8" opacity="0.5"/></svg>`,
  'colossus': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="5" r="6" fill="#7a8a7a"/><rect x="10" y="11" width="20" height="18" rx="2" fill="#6a7a6a"/><rect x="4" y="10" width="8" height="15" rx="2" fill="#5a6a5a"/><rect x="28" y="10" width="8" height="15" rx="2" fill="#5a6a5a"/><rect x="12" y="29" width="7" height="10" rx="1" fill="#6a7a6a"/><rect x="21" y="29" width="7" height="10" rx="1" fill="#6a7a6a"/><line x1="14" y1="14" x2="26" y2="14" stroke="#8a9a8a" stroke-width="1.5"/><circle cx="17" cy="7" r="1.5" fill="#4a5a4a"/><circle cx="23" cy="7" r="1.5" fill="#4a5a4a"/><circle cx="20" cy="19" r="3" fill="#8a9a8a" stroke="#aabbaa" stroke-width="1"/></svg>`,
  'war-drummer': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="5" r="3.5" fill="#d0a870"/><rect x="17" y="8" width="6" height="10" rx="1" fill="#8a3a2a"/><line x1="17" y1="18" x2="13" y2="30" stroke="#8a3a2a" stroke-width="2.5" stroke-linecap="round"/><line x1="23" y1="18" x2="27" y2="30" stroke="#8a3a2a" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="20" cy="28" rx="13" ry="8" fill="#6a2a1a" stroke="#aa4422" stroke-width="2"/><ellipse cx="20" cy="28" rx="13" ry="4" fill="#7a3a2a" stroke="#cc5533" stroke-width="1"/><line x1="10" y1="10" x2="13" y2="22" stroke="#cc8844" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="9" r="2" fill="#aa6633"/><line x1="30" y1="10" x2="27" y2="22" stroke="#cc8844" stroke-width="2" stroke-linecap="round"/><circle cx="30" cy="9" r="2" fill="#aa6633"/></svg>`,
  'revenant': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="6" r="4" fill="#c8d8d0" opacity="0.7"/><circle cx="18" cy="5" r="1" fill="#2a2a3a" opacity="0.8"/><circle cx="22" cy="5" r="1" fill="#2a2a3a" opacity="0.8"/><rect x="16" y="10" width="8" height="13" rx="1" fill="#9ab0aa" opacity="0.65"/><rect x="11" y="11" width="6" height="10" rx="1" fill="#8aa09a" opacity="0.6"/><rect x="23" y="11" width="6" height="10" rx="1" fill="#8aa09a" opacity="0.6"/><line x1="17" y1="23" x2="14" y2="36" stroke="#9ab0aa" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/><line x1="23" y1="23" x2="26" y2="36" stroke="#9ab0aa" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/><line x1="28" y1="8" x2="28" y2="28" stroke="#8899aa" stroke-width="2" stroke-linecap="round" opacity="0.8"/><rect x="25" y="6" width="6" height="2" rx="1" fill="#7a8899" opacity="0.8"/><path d="M12 30 Q16 28 20 32 Q24 28 28 30" stroke="#aabbcc" stroke-width="1" fill="none" opacity="0.5"/></svg>`,
  'gilded-blade': `<svg viewBox="0 0 40 40" fill="none"><line x1="20" y1="2" x2="20" y2="32" stroke="#ffdd44" stroke-width="3" stroke-linecap="round"/><line x1="20" y1="2" x2="20" y2="32" stroke="#ffee88" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/><rect x="13" y="20" width="14" height="4" rx="1" fill="#cc9922" stroke="#ffcc44" stroke-width="1"/><circle cx="13" cy="22" r="2.5" fill="#ee4444" stroke="#ffcc44" stroke-width="1"/><circle cx="27" cy="22" r="2.5" fill="#4444ee" stroke="#ffcc44" stroke-width="1"/><rect x="18" y="30" width="4" height="8" rx="1" fill="#aa7722"/><circle cx="20" cy="4" r="2" fill="#ffffff" opacity="0.6"/><polygon points="20,2 22,5 18,5" fill="#ffee88"/></svg>`,
  'minion': `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="6" r="3" fill="#a09090"/><line x1="20" y1="9" x2="20" y2="22" stroke="#808080" stroke-width="2.5" stroke-linecap="round"/><line x1="20" y1="13" x2="13" y2="18" stroke="#808080" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="13" x2="27" y2="18" stroke="#808080" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="22" x2="15" y2="32" stroke="#808080" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="22" x2="25" y2="32" stroke="#808080" stroke-width="2" stroke-linecap="round"/><line x1="27" y1="18" x2="32" y2="14" stroke="#888888" stroke-width="1.5" stroke-linecap="round"/><rect x="30" y="12" width="4" height="5" rx="0.5" fill="#7a7a7a"/></svg>`,
};

const CARD_POOL = [
  // ── Tier 1 — cost 1 gold ──
  { id: 'iron-fist',   name: 'Iron Fist',   tier: 1, power: 3, ability: 'purge',
    abilityDesc: 'On buy: remove a Minion from your deck', sprite: SPRITES['iron-fist'] },
  { id: 'sellsword',   name: 'Sellsword',   tier: 1, power: 2, ability: 'severance',
    abilityDesc: 'On remove: gain 1 gold', sprite: SPRITES['sellsword'] },
  { id: 'ghost-blade', name: 'Ghost Blade', tier: 1, power: 2, ability: 'redirect',
    abilityDesc: 'If negated: transfer this power to an active card', sprite: SPRITES['ghost-blade'] },
  { id: 'eager-recruit', name: 'Eager Recruit', tier: 1, power: 2, ability: 'recruit',
    abilityDesc: 'Each time you buy a card, this gains +1 power', sprite: SPRITES['eager-recruit'] },
  { id: 'scavenger',   name: 'Scavenger',   tier: 1, power: 2, ability: 'scavenge',
    abilityDesc: 'Each time you remove a card, this gains +1 power', sprite: SPRITES['scavenger'] },
  { id: 'soul-collector', name: 'Soul Collector', tier: 1, power: 1, ability: 'soul-collect',
    abilityDesc: 'In battle: power equals the total of all nullified cards', sprite: SPRITES['soul-collector'] },
  { id: 'blood-pact',  name: 'Blood Pact',  tier: 1, power: 3, ability: 'heirloom',
    abilityDesc: 'On remove: give this card\'s power to a random deck card', sprite: SPRITES['blood-pact'] },

  // ── Tier 2 — cost 2 gold ──
  { id: 'berserker',   name: 'Berserker',   tier: 2, power: 3, ability: 'double-strike',
    abilityDesc: 'Attacks twice in battle', sprite: SPRITES['berserker'] },
  { id: 'warlord',     name: 'Warlord',     tier: 2, power: 2, ability: 'empower',
    abilityDesc: 'On attack: give a random card +1 power permanently', sprite: SPRITES['warlord'] },
  { id: 'arms-dealer', name: 'Arms Dealer', tier: 2, power: 2, ability: 'buy-boost',
    abilityDesc: 'On buy: give a random deck card +2 power', sprite: SPRITES['arms-dealer'] },
  { id: 'duelist',     name: 'Duelist',     tier: 2, power: 4, ability: 'duelist',
    abilityDesc: 'In battle: power equals the number of cards in your deck', sprite: SPRITES['duelist'] },
  { id: 'alchemist',   name: 'Alchemist',   tier: 2, power: 2, ability: 'alchemy',
    abilityDesc: 'On remove: gain gold equal to this card\'s power', sprite: SPRITES['alchemist'] },
  { id: 'paladin',     name: 'Paladin',     tier: 2, power: 2, ability: 'immune',
    abilityDesc: 'In battle: never nullified by boss abilities', sprite: SPRITES['paladin'] },

  // ── Tier 3 — cost 4 gold ──
  { id: 'juggernaut',  name: 'Juggernaut',  tier: 3, power: 4, ability: 'triple-strike',
    abilityDesc: 'Attacks 3 times in battle', sprite: SPRITES['juggernaut'] },
  { id: 'battle-mage', name: 'Battle-Mage', tier: 3, power: 3, ability: 'war-cry',
    abilityDesc: 'On attack: all subsequent cards gain +1 power this battle', sprite: SPRITES['battle-mage'] },
  { id: 'the-chosen',  name: 'The Chosen',  tier: 3, power: 5, ability: 'martyr',
    abilityDesc: 'On remove: all other cards gain +1 power permanently', sprite: SPRITES['the-chosen'] },
  { id: 'colossus',    name: 'Colossus',    tier: 3, power: 1, ability: 'colossus',
    abilityDesc: 'In battle: power equals the total of all other non-nullified cards', sprite: SPRITES['colossus'] },
  { id: 'war-drummer', name: 'War Drummer', tier: 3, power: 4, ability: 'inspire',
    abilityDesc: 'In battle: all other effective cards gain +1 power for the whole battle', sprite: SPRITES['war-drummer'] },
  { id: 'revenant',    name: 'Revenant',    tier: 3, power: 3, ability: 'undying',
    abilityDesc: 'On remove: return to your deck at power 1', sprite: SPRITES['revenant'] },
  { id: 'gilded-blade', name: 'Gilded Blade', tier: 3, power: 1, ability: 'forge',
    abilityDesc: 'On upgrade: gain 1 gold', sprite: SPRITES['gilded-blade'] },
];

const TREASURES = [
  {
    id: 'strength-rune',
    name: 'Strength Rune',
    type: 'immediate',
    desc: 'Every card in your deck permanently gains +1 power.',
    effect: 'all-cards-plus-one',
    sprite: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="24,5 43,43 5,43" stroke="#e07030" stroke-width="2.5" stroke-linejoin="round"/>
      <line x1="24" y1="20" x2="24" y2="34" stroke="#e07030" stroke-width="2.5"/>
      <line x1="17" y1="27" x2="31" y2="27" stroke="#e07030" stroke-width="2.5"/>
    </svg>`,
  },
  {
    id: 'gold-hoard',
    name: 'Gold Hoard',
    type: 'immediate',
    desc: 'Gain 5 gold right now.',
    effect: 'gain-gold-5',
    sprite: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="24" cy="39" rx="14" ry="5" stroke="#c9a84c" stroke-width="2"/>
      <rect x="10" y="28" width="28" height="11" fill="#0d0d1a"/>
      <ellipse cx="24" cy="28" rx="14" ry="5" stroke="#c9a84c" stroke-width="2"/>
      <rect x="10" y="18" width="28" height="10" fill="#0d0d1a"/>
      <ellipse cx="24" cy="18" rx="14" ry="5" stroke="#c9a84c" stroke-width="2"/>
    </svg>`,
  },
  {
    id: 'void-gem',
    name: 'Void Gem',
    type: 'immediate',
    desc: 'Add a free Power 3 card to your deck immediately.',
    effect: 'add-power-3',
    sprite: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="24,4 44,20 24,44 4,20" stroke="#44ff88" stroke-width="2.5" stroke-linejoin="round"/>
      <polyline points="4,20 24,28 44,20" stroke="#44ff88" stroke-width="1.5" opacity="0.7"/>
      <line x1="24" y1="4" x2="24" y2="28" stroke="#44ff88" stroke-width="1.5" opacity="0.5"/>
    </svg>`,
  },
  {
    id: 'war-banner',
    name: 'War Banner',
    type: 'relic',
    desc: 'Your highest-power card attacks an extra time in every battle.',
    effect: 'double-highest',
    relicDesc: 'Highest card +1 attack',
    sprite: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="13" y1="4" x2="13" y2="44" stroke="#c9a84c" stroke-width="2.5"/>
      <circle cx="13" cy="4" r="2.5" fill="#c9a84c"/>
      <path d="M13,9 L40,19 L13,30 Z" stroke="#c9a84c" stroke-width="2" stroke-linejoin="round" fill="#1e1800"/>
    </svg>`,
  },
  {
    id: 'sages-scroll',
    name: "Sage's Scroll",
    type: 'relic',
    desc: 'Card upgrades cost 1 gold instead of 2.',
    effect: 'upgrade-discount',
    relicDesc: 'Upgrades cost 1',
    sprite: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="10" width="24" height="28" rx="2" stroke="#d0a0ff" stroke-width="2"/>
      <path d="M12,10 Q12,4 18,4 Q18,10 12,10" stroke="#d0a0ff" stroke-width="1.5"/>
      <path d="M36,10 Q36,4 30,4 Q30,10 36,10" stroke="#d0a0ff" stroke-width="1.5"/>
      <path d="M12,38 Q12,44 18,44 Q18,38 12,38" stroke="#d0a0ff" stroke-width="1.5"/>
      <path d="M36,38 Q36,44 30,44 Q30,38 36,38" stroke="#d0a0ff" stroke-width="1.5"/>
      <line x1="17" y1="20" x2="31" y2="20" stroke="#d0a0ff" stroke-width="1.5" opacity="0.7"/>
      <line x1="17" y1="26" x2="31" y2="26" stroke="#d0a0ff" stroke-width="1.5" opacity="0.7"/>
      <line x1="17" y1="32" x2="27" y2="32" stroke="#d0a0ff" stroke-width="1.5" opacity="0.7"/>
    </svg>`,
  },
  {
    id: 'shadow-cloak',
    name: 'Shadow Cloak',
    type: 'relic',
    desc: 'Automatically negate the next boss ability that targets your cards. One use.',
    effect: 'negate-ability',
    relicDesc: 'Negates next ability',
    sprite: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30,8 A18,18 0 1,0 30,40 A12,12 0 1,1 30,8 Z" stroke="#8888cc" stroke-width="2.5" fill="#080812"/>
      <circle cx="35" cy="12" r="2" fill="#8888cc" opacity="0.6"/>
      <circle cx="38" cy="20" r="1.5" fill="#8888cc" opacity="0.4"/>
    </svg>`,
  },
  {
    id: 'iron-gauntlets',
    name: 'Iron Gauntlets',
    type: 'relic',
    desc: 'Removing a card costs 0 gold instead of 1.',
    effect: 'free-remove',
    relicDesc: 'Remove costs 0',
    sprite: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="24" width="18" height="14" rx="3" stroke="#aaaaaa" stroke-width="2"/>
      <rect x="15" y="13" width="18" height="13" rx="2" stroke="#aaaaaa" stroke-width="2"/>
      <rect x="17" y="38" width="14" height="6" rx="2" stroke="#aaaaaa" stroke-width="2"/>
      <line x1="20" y1="13" x2="20" y2="24" stroke="#aaaaaa" stroke-width="1.5" opacity="0.6"/>
      <line x1="24" y1="13" x2="24" y2="24" stroke="#aaaaaa" stroke-width="1.5" opacity="0.6"/>
      <line x1="28" y1="13" x2="28" y2="24" stroke="#aaaaaa" stroke-width="1.5" opacity="0.6"/>
    </svg>`,
  },
  {
    id: 'arcane-sigil',
    name: 'Arcane Sigil',
    type: 'relic',
    desc: 'Earn 1 bonus gold after every future battle victory.',
    effect: 'bonus-gold-per-win',
    relicDesc: '+1 gold per win',
    sprite: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="18" stroke="#d0a0ff" stroke-width="1.5" opacity="0.4"/>
      <polygon points="24,6 28,18 41,18 31,26 35,39 24,31 13,39 17,26 7,18 20,18" stroke="#d0a0ff" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="24" cy="24" r="3" fill="#d0a0ff" opacity="0.7"/>
    </svg>`,
  },
  {
    id: 'codex-of-power',
    name: 'Codex of Power',
    type: 'immediate',
    desc: 'Unlock Tier 2 cards in the shop. The shop expands to 5 cards.',
    effect: 'unlock-tier-2',
    sprite: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="6" width="26" height="36" rx="2" stroke="#4488ff" stroke-width="2"/>
      <rect x="9" y="6" width="6" height="36" rx="2" fill="#0a1830" stroke="#2255cc" stroke-width="1.5"/>
      <line x1="19" y1="15" x2="31" y2="15" stroke="#4488ff" stroke-width="1.5" opacity="0.8"/>
      <line x1="19" y1="21" x2="31" y2="21" stroke="#4488ff" stroke-width="1.5" opacity="0.6"/>
      <line x1="19" y1="27" x2="28" y2="27" stroke="#4488ff" stroke-width="1.5" opacity="0.4"/>
      <circle cx="33" cy="34" r="6" fill="#0d0d1a" stroke="#4488ff" stroke-width="1.5"/>
      <text x="33" y="38" text-anchor="middle" font-size="8" fill="#4488ff" font-family="sans-serif">2</text>
    </svg>`,
  },
  {
    id: 'forbidden-tome',
    name: 'Forbidden Tome',
    type: 'immediate',
    desc: 'Unlock Tier 3 cards in the shop. The shop expands to 7 cards.',
    effect: 'unlock-tier-3',
    sprite: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="6" width="26" height="36" rx="2" stroke="#cc44ff" stroke-width="2"/>
      <rect x="9" y="6" width="6" height="36" rx="2" fill="#1a0830" stroke="#882299" stroke-width="1.5"/>
      <line x1="19" y1="15" x2="31" y2="15" stroke="#cc44ff" stroke-width="1.5" opacity="0.8"/>
      <line x1="19" y1="21" x2="31" y2="21" stroke="#cc44ff" stroke-width="1.5" opacity="0.6"/>
      <line x1="19" y1="27" x2="28" y2="27" stroke="#cc44ff" stroke-width="1.5" opacity="0.4"/>
      <circle cx="33" cy="34" r="6" fill="#0d0d1a" stroke="#cc44ff" stroke-width="1.5"/>
      <text x="33" y="38" text-anchor="middle" font-size="8" fill="#cc44ff" font-family="sans-serif">3</text>
    </svg>`,
  },
];

// ── State ─────────────────────────────────────────────────────────────────────

let state = {};
let nextId = 10;
let _battleGeneration = 0;
let _timerInterval = null;
let _dragSrcId = null;

function makeMinion(id) {
  return { id, power: 1, name: 'Minion', tier: 0, ability: 'none', abilityDesc: '', isStarter: true, sprite: SPRITES['minion'] };
}

function init() {
  stopTimer();
  nextId = 10;
  state = {
    gold: 2,
    deck: [makeMinion(1), makeMinion(2), makeMinion(3)],
    phase: 'title',
    roomIndex: 0,
    shopCards: [],
    shopTier: 1,
    mode: null,
    battleResult: null,
    relics: [],
    treasureChoices: [],
    timerLeft: 60,
    timerPaused: false,
  };
  render();
}

// ── Timer ─────────────────────────────────────────────────────────────────────

function startRoomTimer() {
  state.timerLeft = 60;
  state.timerPaused = false;
  clearInterval(_timerInterval);
  _timerInterval = setInterval(tickTimer, 1000);
}

function tickTimer() {
  if (state.timerPaused) return;
  state.timerLeft -= 1;
  updateTimerDisplay();
  if (state.timerLeft <= 0) { stopTimer(); enterBattle(); }
}

function stopTimer() {
  clearInterval(_timerInterval);
  _timerInterval = null;
}

function updateTimerDisplay() {
  const el = document.getElementById('room-timer');
  if (!el) return;
  el.textContent = state.timerLeft + 's';
  el.classList.toggle('timer-urgent', state.timerLeft <= 10);
}

function toggleTimerPause() {
  state.timerPaused = !state.timerPaused;
  render();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cardCost(card) {
  return 2;
}

function cardAttackCount(card) {
  if (card.ability === 'triple-strike') return 3;
  if (card.ability === 'double-strike')  return 2;
  return 1;
}

function generateShop() {
  const pool = CARD_POOL.filter(c => c.tier <= state.shopTier);
  const count = state.shopTier === 1 ? 3 : state.shopTier === 2 ? 5 : 7;
  return shuffle(pool).slice(0, count).map(tpl => ({
    id: nextId++,
    templateId: tpl.id,
    name: tpl.name,
    tier: tpl.tier,
    power: tpl.power,
    ability: tpl.ability,
    abilityDesc: tpl.abilityDesc,
    sprite: tpl.sprite,
    isStarter: false,
  }));
}

function pickTreasures() {
  const choices = [];

  // Always slot in the next-tier unlock when it's available
  if (state.shopTier === 1) {
    const u = TREASURES.find(t => t.effect === 'unlock-tier-2');
    if (u) choices.push(u);
  } else if (state.shopTier === 2) {
    const u = TREASURES.find(t => t.effect === 'unlock-tier-3');
    if (u) choices.push(u);
  }

  const chosenIds = new Set(choices.map(c => c.id));
  const owned     = new Set(state.relics);
  const pool = shuffle(TREASURES.filter(t =>
    !chosenIds.has(t.id) &&
    t.effect !== 'unlock-tier-2' &&
    t.effect !== 'unlock-tier-3' &&
    !(t.type === 'relic' && owned.has(t.effect))
  ));
  while (choices.length < 3 && pool.length > 0) choices.push(pool.shift());
  return shuffle(choices);
}

function upgradeCost() {
  return state.relics.includes('upgrade-discount') ? 1 : 2;
}

function removeCost() {
  return state.relics.includes('free-remove') ? 0 : 1;
}

function totalPower(deck) {
  return deck.reduce((s, c) => s + c.power * cardAttackCount(c), 0);
}

function buildNulledSet(deck, ability) {
  const eligible = deck.filter(c => c.ability !== 'immune');
  const byAsc  = [...eligible].sort((a, b) => a.power - b.power);
  const byDesc = [...eligible].sort((a, b) => b.power - a.power);
  const nulled = new Set();
  switch (ability) {
    case 'thick-hide': if (byAsc[0]) nulled.add(byAsc[0].id); break;
    case 'hex':
      if (byAsc[0]) nulled.add(byAsc[0].id);
      if (byAsc[1]) nulled.add(byAsc[1].id);
      break;
    case 'cull': {
      const keep = new Set(byDesc.slice(0, 5).map(c => c.id));
      eligible.forEach(c => { if (!keep.has(c.id)) nulled.add(c.id); });
      break;
    }
    case 'dragons-gaze': {
      const keep = new Set(byDesc.slice(0, 6).map(c => c.id));
      eligible.forEach(c => { if (!keep.has(c.id)) nulled.add(c.id); });
      break;
    }
  }
  return nulled;
}

function resolveNulledSet(deck, ability) {
  const firstNulled = buildNulledSet(deck, ability);
  if (!deck.some(c => c.ability === 'soul-collect')) return firstNulled;
  const firstSum = deck.filter(c => firstNulled.has(c.id)).reduce((s, c) => s + c.power, 0);
  if (firstSum === 0) return firstNulled;
  // Second pass: give soul-collect cards their absorbed power, then re-evaluate nullification order
  const boostedDeck = deck.map(c => c.ability === 'soul-collect' ? { ...c, power: firstSum } : c);
  return buildNulledSet(boostedDeck, ability);
}

function effectivePower(deck, ability) {
  const nulled = resolveNulledSet(deck, ability);
  const nulledPowerSum    = deck.filter(c =>  nulled.has(c.id)).reduce((s, c) => s + c.power, 0);
  const otherEffectiveSum = deck.filter(c => !nulled.has(c.id) && c.ability !== 'colossus').reduce((s, c) => s + c.power, 0);

  let ep = 0;
  for (const c of deck) {
    if (!nulled.has(c.id)) {
      const cp = c.ability === 'soul-collect' ? nulledPowerSum
               : c.ability === 'colossus'     ? otherEffectiveSum
               : c.ability === 'duelist'      ? deck.length
               : c.power;
      ep += cp * cardAttackCount(c);
    }
  }

  // War Banner: one extra hit equal to highest base power
  if (state.relics.includes('double-highest')) {
    ep += Math.max(...deck.map(c => c.power));
  }

  // Redirect: nulled redirect cards transfer their power to an active card
  for (const c of deck) {
    if (nulled.has(c.id) && c.ability === 'redirect') {
      if (deck.some(d => !nulled.has(d.id) && d.id !== c.id)) ep += c.power;
    }
  }

  const effectiveOrder = deck.filter(c => !nulled.has(c.id));

  // War Cry: each war-cry card gives +1 to every subsequent effective card's attack count
  effectiveOrder.forEach((c, i) => {
    if (c.ability === 'war-cry') {
      for (let j = i + 1; j < effectiveOrder.length; j++) {
        ep += cardAttackCount(effectiveOrder[j]);
      }
    }
  });

  // Inspire: each inspire card gives +1 power to every other effective card
  effectiveOrder.forEach((c, i) => {
    if (c.ability === 'inspire') {
      effectiveOrder.forEach((ci, j) => { if (j !== i) ep += cardAttackCount(ci); });
    }
  });

  return ep;
}

function getCardBattleInfo(deck, ability) {
  const nulled = resolveNulledSet(deck, ability);
  const nulledPowerSum    = deck.filter(c =>  nulled.has(c.id)).reduce((s, c) => s + c.power, 0);
  const otherEffectiveSum = deck.filter(c => !nulled.has(c.id) && c.ability !== 'colossus').reduce((s, c) => s + c.power, 0);

  let result = deck.map(c => {
    const eff = !nulled.has(c.id);
    return {
      card: c,
      effective: eff,
      attacks: cardAttackCount(c),
      doubled: false,
      displayPower: (eff && c.ability === 'soul-collect') ? nulledPowerSum
                  : (eff && c.ability === 'colossus')     ? otherEffectiveSum
                  : (eff && c.ability === 'duelist')      ? deck.length
                  : c.power,
    };
  });

  // War Banner: mark first non-nulled highest-power card as doubled
  if (state.relics.includes('double-highest')) {
    const maxPower = Math.max(...deck.map(c => c.power));
    let marked = false;
    result = result.map(info => {
      if (!marked && info.effective && info.card.power === maxPower) {
        marked = true;
        return { ...info, doubled: true };
      }
      return info;
    });
  }

  return result;
}

function abilityExplanation(deck, ability) {
  const asc = [...deck].map(c => c.power).sort((a, b) => a - b);
  switch (ability) {
    case 'thick-hide':
      return `Lowest card (power ${asc[0]}) nullified`;
    case 'hex':
      return `2 lowest cards (power ${asc[0]}, ${asc[1] ?? 0}) nullified`;
    case 'cull':
      return `Only top ${Math.min(5, deck.length)} cards count`;
    case 'dragons-gaze':
      return `Only top ${Math.min(6, deck.length)} cards count`;
    default:
      return null;
  }
}

function relicChipHTML(effect) {
  const t = TREASURES.find(t => t.effect === effect);
  return `<span class="relic-chip" title="${t?.desc ?? ''}">
    <span class="relic-chip-sprite">${t?.sprite ?? ''}</span>
    ${t ? t.name : effect}
  </span>`;
}

// ── Actions ───────────────────────────────────────────────────────────────────

function buyCard(shopCard) {
  if (state.timerPaused) return;
  const cost = cardCost(shopCard);
  if (state.gold < cost) return;
  state.gold -= cost;

  const deckCard = {
    id: nextId++,
    templateId: shopCard.templateId,
    name: shopCard.name,
    tier: shopCard.tier,
    power: shopCard.power,
    ability: shopCard.ability,
    abilityDesc: shopCard.abilityDesc,
    sprite: shopCard.sprite,
    isStarter: false,
  };
  state.deck.push(deckCard);
  state.shopCards = state.shopCards.filter(c => c.id !== shopCard.id);

  // On-buy triggers
  if (shopCard.ability === 'purge') {
    const minionIdx = state.deck.findIndex(c => c.isStarter);
    if (minionIdx >= 0) state.deck.splice(minionIdx, 1);
  } else if (shopCard.ability === 'buy-boost') {
    const others = state.deck.filter(c => c.id !== deckCard.id);
    if (others.length > 0) {
      others[Math.floor(Math.random() * others.length)].power += 2;
    }
  }

  // Recruit: all recruit cards in deck gain +1 on any buy
  state.deck.forEach(c => { if (c.ability === 'recruit') c.power += 1; });

  state.mode = null;
  render();
}

function removeCard(card) {
  if (state.timerPaused) return;
  const cost = removeCost();
  if (state.gold < cost || state.deck.length <= 1) return;
  state.gold -= cost;

  // Scavenge: all scavenge cards except the one being removed gain +1
  state.deck.forEach(c => { if (c.ability === 'scavenge' && c.id !== card.id) c.power += 1; });

  // On-remove triggers (fire before removal)
  if (card.ability === 'severance') {
    state.gold += 1;
  } else if (card.ability === 'martyr') {
    state.deck.forEach(c => { if (c.id !== card.id) c.power += 1; });
  } else if (card.ability === 'heirloom') {
    const others = state.deck.filter(c => c.id !== card.id);
    if (others.length > 0) others[Math.floor(Math.random() * others.length)].power += card.power;
  } else if (card.ability === 'alchemy') {
    state.gold += card.power;
  }

  state.deck = state.deck.filter(c => c.id !== card.id);

  if (card.ability === 'undying') {
    state.deck.push({ ...card, id: nextId++, power: 1 });
  }

  state.mode = null;
  render();
}

function upgradeCard(card) {
  if (state.timerPaused) return;
  const cost = upgradeCost();
  if (state.gold < cost) return;
  state.gold -= cost;
  card.power += 1;
  if (card.ability === 'forge') state.gold += 1;
  state.mode = null;
  render();
}

function deckCardClick(card) {
  if (state.mode === 'remove') removeCard(card);
  else if (state.mode === 'upgrade') upgradeCard(card);
}

function setMode(mode) {
  state.mode = state.mode === mode ? null : mode;
  render();
}

function refreshShop() {
  if (state.timerPaused) return;
  if (state.gold < 1) return;
  state.gold -= 1;
  state.shopCards = generateShop();
  state.mode = null;
  render();
}

function startGame() {
  state.shopCards = generateShop();
  state.phase = 'room';
  render();
  startRoomTimer();
}

function enterBattle() {
  if (state.timerPaused) return;
  stopTimer();
  const boss = BOSSES[state.roomIndex];
  let effectiveAbility = boss.ability;
  let abilityNegated = false;

  if (effectiveAbility !== 'none' && state.relics.includes('negate-ability')) {
    state.relics = state.relics.filter(r => r !== 'negate-ability');
    effectiveAbility = 'none';
    abilityNegated = true;
  }

  const bossPower = boss.power + boss.perCard * state.deck.length;
  const tp = totalPower(state.deck);
  const ep = effectivePower(state.deck, effectiveAbility);

  let explanation = abilityExplanation(state.deck, effectiveAbility);
  if (abilityNegated) {
    explanation = `Shadow Cloak negated: ${boss.abilityDesc.split(' — ')[0]}`;
  }
  if (state.relics.includes('double-highest')) {
    const bonus = Math.max(...state.deck.map(c => c.power));
    const bannerNote = `War Banner: +${bonus} bonus hit from highest card`;
    explanation = explanation ? `${explanation} · ${bannerNote}` : bannerNote;
  }

  state.battleResult = {
    boss,
    bossPower,
    effectiveAbility,
    abilityNegated,
    totalPower: tp,
    effectivePower: ep,
    explanation,
    won: ep >= bossPower,
  };
  state.phase = 'battle';
  state.mode = null;
  render();
}

function afterBattle() {
  if (!state.battleResult.won) {
    state.phase = 'gameover';
    render();
    return;
  }
  const bonusGold = state.relics.includes('bonus-gold-per-win') ? 1 : 0;
  const goldReward = 3 + bonusGold;
  state.gold += goldReward;
  state.battleResult.goldReward = goldReward;
  state.treasureChoices = pickTreasures();
  state.phase = 'treasure';
  render();
}

function applyTreasure(treasure) {
  switch (treasure.effect) {
    case 'all-cards-plus-one':
      state.deck.forEach(c => c.power += 1);
      break;
    case 'gain-gold-5':
      state.gold += 5;
      break;
    case 'add-power-3':
      state.deck.push({ id: nextId++, power: 3, name: 'Warrior', tier: 1,
        ability: 'none', abilityDesc: '', isStarter: false });
      break;
    case 'unlock-tier-2':
      state.shopTier = 2;
      break;
    case 'unlock-tier-3':
      state.shopTier = 3;
      break;
    default:
      state.relics.push(treasure.effect);
      break;
  }
}

function chooseTreasure(treasure) {
  applyTreasure(treasure);
  state.roomIndex++;
  if (state.roomIndex >= 5) {
    state.phase = 'win';
  } else {
    state.shopCards = generateShop();
    state.phase = 'room';
    state.mode = null;
    render();
    startRoomTimer();
    return;
  }
  render();
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function cardHTML(card, selectable) {
  const hasAbility = card.ability && card.ability !== 'none';
  const tierClass  = card.tier > 0 ? ` tier-${card.tier}` : '';
  const subLabel   = card.isStarter ? 'minion'
    : hasAbility ? card.ability.replace(/-/g, ' ') : 'power';
  return `<div class="card${selectable ? ' selectable' : ''}${tierClass}" data-id="${card.id}" data-tip-name="${card.name}" data-tip-power="${card.power}" data-tip-tier="${card.tier}" data-tip-desc="${card.abilityDesc}">
    <div class="card-power">${card.power}</div>
    <div class="card-sprite">${card.sprite || ''}</div>
    <div class="card-sub">${subLabel}</div>
  </div>`;
}

function shopCardHTML(card) {
  const cost      = cardCost(card);
  const canAfford = state.gold >= cost;
  const tierLabel = { 1: 'T1', 2: 'T2', 3: 'T3' }[card.tier] ?? '';
  const tierCls   = `sc-tier-${card.tier}`;
  return `
    <div class="shop-card" data-tip-name="${card.name}" data-tip-power="${card.power}" data-tip-tier="${card.tier}" data-tip-desc="${card.abilityDesc}" data-tip-cost="${cost}">
      <div class="sc-header">
        <span class="sc-tier ${tierCls}">${tierLabel}</span>
        <span class="sc-power">${card.power}</span>
      </div>
      <div class="sc-name">${card.name}</div>
      <div class="sc-sprite">${card.sprite || ''}</div>
      <div class="sc-ability${card.abilityDesc ? '' : ' sc-none'}">${card.abilityDesc || '—'}</div>
      <button class="btn-buy" data-id="${card.id}" ${!canAfford || state.timerPaused ? 'disabled' : ''}>Buy</button>
    </div>`;
}

function renderTitle() {
  return `
    <div class="title-screen">
      <h1>Dungeon Crawler 1</h1>
      <p class="subtitle">Five rooms. Five battles. Build your deck wisely.</p>
      <div class="starting-box">
        <div>Starting deck: <strong>3 cards at Power 1</strong></div>
        <div>Starting gold: <strong>2</strong></div>
        <div>Battle reward: <strong>3 gold + 1 treasure per win</strong></div>
      </div>
      <button id="btn-start">Begin Your Descent</button>
    </div>
  `;
}

function renderRoom() {
  const boss = BOSSES[state.roomIndex];
  const roomNum = state.roomIndex + 1;
  const tp = totalPower(state.deck);
  const deckSelectable = (state.mode === 'remove' || state.mode === 'upgrade') && !state.timerPaused;
  const upCost = upgradeCost();
  const rmCost = removeCost();
  const canRemove  = state.gold >= rmCost && state.deck.length > 1 && !state.timerPaused;
  const canUpgrade = state.gold >= upCost && !state.timerPaused;

  const modeHint = state.mode === 'remove'
    ? '<div class="mode-hint">Click a card to remove it.</div>'
    : state.mode === 'upgrade'
    ? '<div class="mode-hint">Click a card to upgrade it (+1 power).</div>'
    : '';

  const shopHTML = state.shopCards.length > 0
    ? state.shopCards.map(shopCardHTML).join('')
    : '<span class="empty-text">Shop is empty.</span>';

  const tierLabel = state.shopTier === 1 ? 'Tier 1'
    : state.shopTier === 2 ? 'Tiers 1–2' : 'Tiers 1–3';

  const relicsHTML = state.relics.length > 0
    ? `<div class="panel">
        <div class="panel-title">Relics</div>
        <div class="relics-row">${state.relics.map(relicChipHTML).join('')}</div>
      </div>`
    : '';

  return `
    <div>
      <div class="top-bar">
        <span class="phase-label">Room ${roomNum} of 5</span>
        <div class="timer-wrap">
          <span id="room-timer" class="room-timer${state.timerLeft <= 10 ? ' timer-urgent' : ''}">${state.timerLeft}s</span>
          <button id="btn-timer-pause" class="btn-timer-pause">${state.timerPaused ? 'Resume' : 'Pause'}</button>
          <span id="timer-pause-tip" class="timer-pause-tip"${state.timerPaused ? '' : ' style="display:none"'}>You may not complete actions while the timer is paused, but you may still plan your strategy.</span>
        </div>
        <span class="gold-badge">${state.gold} gold</span>
      </div>

      <div class="room-grid">
        <div>
          <div class="panel">
            <div class="panel-title">Your Deck <span>Power: ${tp}</span></div>
            <div class="card-row">
              ${state.deck.map(c => cardHTML(c, deckSelectable)).join('')}
            </div>
            ${modeHint}
          </div>

          <div class="panel">
            <div class="panel-title">Actions</div>
            <div class="action-buttons">
              <button class="btn-secondary ${state.mode === 'remove' ? 'active' : ''}"
                id="btn-remove-mode" ${!canRemove ? 'disabled' : ''}>
                Remove Card (${rmCost}g)
              </button>
              <button class="btn-secondary ${state.mode === 'upgrade' ? 'active' : ''}"
                id="btn-upgrade-mode" ${!canUpgrade ? 'disabled' : ''}>
                Upgrade Card (${upCost}g)
              </button>
              <button class="btn-secondary" id="btn-refresh-shop"
                ${state.gold < 1 || state.timerPaused ? 'disabled' : ''}>
                Refresh Shop (1g)
              </button>
            </div>
          </div>

          ${relicsHTML}
        </div>

        <div class="panel boss-preview">
          <div class="panel-title">Next Battle</div>
          <div class="boss-preview-sprite">${boss.sprite}</div>
          <span class="boss-name">${boss.name}</span>
          ${boss.perCard > 0
            ? `<span class="boss-stat">Power: ${boss.power}<span class="boss-per-card"> +${boss.perCard}/card</span></span>
               <span class="boss-threat">Threat: ${boss.power + boss.perCard * state.deck.length}
                 <span class="boss-threat-note">(${boss.power} + ${boss.perCard}×${state.deck.length})</span></span>`
            : `<span class="boss-stat">Power: ${boss.power}</span>`
          }
          <span class="boss-ability-text">${boss.abilityDesc}</span>
        </div>
      </div>

      <div class="panel shop-panel">
        <div class="panel-title">Shop <span class="shop-tier-badge">${tierLabel}</span></div>
        <div class="shop-items">${shopHTML}</div>
      </div>

      <button class="proceed-btn" id="btn-enter-battle" ${state.timerPaused ? 'disabled' : ''}>Enter Battle →</button>
    </div>
  `;
}

function renderBattle() {
  const { boss, bossPower, effectiveAbility, abilityNegated, effectivePower: ep, won, explanation } = state.battleResult;
  const battleNum = state.roomIndex + 1;
  const cardInfo = getCardBattleInfo(state.deck, effectiveAbility);

  const cardsHTML = cardInfo.map(({ card, effective, doubled, attacks, displayPower }, i) => {
    const sub = attacks > 1 ? `×${attacks}` : doubled ? 'banner' : (card.ability !== 'none' ? card.ability.split('-')[0] : 'power');
    return `<div class="battle-card ${effective ? 'effective' : 'nullified'}${doubled ? ' doubled' : ''}" data-idx="${i}" data-tip-name="${card.name}" data-tip-power="${displayPower}" data-tip-tier="${card.tier}" data-tip-desc="${card.abilityDesc}" data-tip-nullified="${!effective}">
      <div class="card-power">${displayPower}</div>
      <div class="card-sprite">${card.sprite || ''}</div>
      <div class="card-sub">${sub}</div>
    </div>`;
  }).join('');

  const bossAbilityLine = boss.ability !== 'none'
    ? `<div class="boss-ability-label">${boss.abilityDesc}${abilityNegated ? ' <span class="negated-tag">Negated</span>' : ''}</div>`
    : '';

  const bossScalingLine = boss.perCard > 0
    ? `<div class="boss-scaling-line">${boss.power} + ${boss.perCard}×${state.deck.length} cards</div>`
    : '';

  return `
    <div class="battle-screen">
      <div class="top-bar">
        <span class="phase-label">Battle ${battleNum} of 5</span>
        <span class="gold-badge">${state.gold} gold</span>
      </div>

      <div class="boss-section">
        <div class="boss-battle-wrap">
          <div class="boss-card" id="boss-card">
            <div class="boss-sprite">${boss.sprite}</div>
            <div class="boss-name-display">${boss.name}</div>
            ${bossAbilityLine}
          </div>
          <div class="boss-hp-bar-wrap">
            <div class="boss-hp-fill" id="boss-hp-fill"></div>
          </div>
          <div class="boss-hp-text" id="boss-hp-text">${bossPower} / ${bossPower}</div>
          ${bossScalingLine}
        </div>
      </div>

      <div class="cards-section">
        <div class="battle-cards-row">${cardsHTML}</div>
        ${explanation ? `<div class="ability-note" id="ability-note">${explanation}</div>` : ''}
      </div>

      <div class="battle-outcome" id="battle-outcome"></div>

      <div class="battle-actions">
        <button class="btn-secondary" id="btn-replay-battle" style="opacity:0;pointer-events:none">↺ Replay</button>
        <button class="proceed-btn" id="btn-after-battle" style="opacity:0;pointer-events:none">
          ${won ? 'Choose Treasure →' : 'Continue'}
        </button>
      </div>
    </div>
  `;
}

function renderTreasure() {
  const { boss, goldReward } = state.battleResult;
  const isLast = state.roomIndex >= 4;
  const tp = totalPower(state.deck);

  const deckHTML = `
    <div class="panel treasure-deck-panel">
      <div class="panel-title">Your Deck <span>Total Power: ${tp}</span></div>
      <div class="card-row">
        ${state.deck.map(c => cardHTML(c, false)).join('')}
      </div>
    </div>
  `;

  const treasuresHTML = state.treasureChoices.map(t => `
    <div class="treasure-card" data-id="${t.id}">
      <div class="t-sprite">${t.sprite}</div>
      <div class="t-name">${t.name}</div>
      <div class="t-type">${t.type === 'immediate' ? 'One-time' : 'Relic'}</div>
      <div class="t-desc">${t.desc}</div>
    </div>
  `).join('');

  return `
    <div class="treasure-screen">
      <div class="top-bar" style="width:100%">
        <span class="phase-label">${boss.name} Defeated</span>
        <span class="gold-badge">${state.gold} gold</span>
      </div>

      <div class="treasure-reward">
        <div class="result-banner result-win">Victory!</div>
        <p class="reward-text">You earned <strong>${goldReward} gold</strong> for slaying ${boss.name}.</p>
      </div>

      ${deckHTML}

      <p class="treasure-prompt">Choose one treasure to carry forward:</p>

      <div class="treasure-grid">
        ${treasuresHTML}
      </div>

      ${isLast ? '<p class="treasure-final-note">After claiming your treasure, the dungeon is yours.</p>' : ''}
    </div>
  `;
}

function updateHpBar(current, max) {
  const fill = document.getElementById('boss-hp-fill');
  const text = document.getElementById('boss-hp-text');
  const pct  = Math.max(0, (current / max) * 100);
  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent  = Math.max(0, current) + ' / ' + max;
}

function showDamageNumber(dmg, marker) {
  const bossCard = document.getElementById('boss-card');
  if (!bossCard) return;
  const el = document.createElement('div');
  if (dmg === null) {
    el.className   = marker === 'redirected' ? 'damage-number damage-redirect' : 'damage-number damage-null';
    el.textContent = marker === 'redirected' ? 'Redirected!' : 'Nullified';
  } else {
    const extra = marker === 'banner' ? ' damage-banner' : marker === 'redirect' ? ' damage-redirect' : '';
    el.className   = `damage-number${extra}`;
    el.textContent = String(dmg);
  }
  bossCard.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function showCardPop(cardIdx, text, className) {
  const cardEl = document.querySelectorAll('.battle-card')[cardIdx];
  if (!cardEl) return;
  // Append to body with fixed coords so opacity doesn't inherit from a .used card
  const rect = cardEl.getBoundingClientRect();
  const pop  = document.createElement('div');
  pop.className   = className;
  pop.textContent = text;
  pop.style.left  = (rect.left + rect.width / 2) + 'px';
  pop.style.top   = rect.top + 'px';
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 1100);
}

function updateBattleCardPower(cardIdx, newPower) {
  const el = document.querySelectorAll('.battle-card')[cardIdx]?.querySelector('.card-power');
  if (el) el.textContent = String(newPower);
}

function showRedirectBadge(cardIdx, amount) {
  const cardEl = document.querySelectorAll('.battle-card')[cardIdx];
  if (!cardEl) return;
  const rect  = cardEl.getBoundingClientRect();
  const badge = document.createElement('div');
  badge.className   = 'redirect-badge battle-pop';
  badge.textContent = `+${amount} redirect`;
  badge.style.left  = (rect.left + rect.width / 2) + 'px';
  badge.style.top   = (rect.bottom - 8) + 'px';
  document.body.appendChild(badge);
}

function animateBattle(isReplay = false) {
  _battleGeneration++;
  const myGen = _battleGeneration;
  function safeTick(fn, delay) {
    setTimeout(() => { if (_battleGeneration !== myGen) return; fn(); }, delay);
  }

  const { won, bossPower, effectiveAbility, explanation, effectivePower: ep } = state.battleResult;
  const cardInfo = getCardBattleInfo(state.deck, effectiveAbility);

  const CHARGE_MS = 280;  // ms to hold in charge pose before first hit
  const HIT_MS    = 200;  // ms between successive hits (multi-strike)
  const GAP_MS    = 90;   // ms gap between one card finishing and next starting

  let runningHp    = bossPower;
  let warCryBonus  = 0;   // accumulates as war-cry cards fire
  let inspireBonus = 0;   // set before attacks start (inspire is a pre-battle aura)

  // Precompute redirect: nulled redirect card → target effective card index
  const redirectBonus = new Map();  // targetIdx → extra power
  cardInfo.forEach(({ card, effective }, i) => {
    if (!effective && card.ability === 'redirect') {
      const targets = cardInfo.map((ci, j) => j).filter(j => cardInfo[j].effective && j !== i);
      if (targets.length > 0) {
        const tgt = targets[Math.floor(Math.random() * targets.length)];
        redirectBonus.set(tgt, (redirectBonus.get(tgt) || 0) + card.power);
      }
    }
  });

  // 1. Boss enters
  safeTick(() => document.getElementById('boss-card')?.classList.add('enter'), 50);

  // 2. Cards enter (stagger)
  const CARDS_START = 550;
  const STAGGER     = Math.min(80, 500 / cardInfo.length);
  document.querySelectorAll('.battle-card').forEach((el, i) => {
    safeTick(() => el.classList.add('enter'), CARDS_START + i * STAGGER);
  });

  // 3. Sequential attacks — variable timing based on attack count
  const ATTACK_START = CARDS_START + cardInfo.length * STAGGER + 380;
  let t = ATTACK_START;

  // Inspire: passive aura fires once before the first attack, buffing all other effective cards
  const inspireIdxs = cardInfo
    .map((info, i) => ({ ...info, idx: i }))
    .filter(({ card, effective }) => effective && card.ability === 'inspire');
  inspireBonus = inspireIdxs.length;
  if (inspireBonus > 0) {
    safeTick(() => {
      inspireIdxs.forEach(({ idx }) => showCardPop(idx, 'INSPIRE!', 'inspire-pop'));
      cardInfo.forEach((ci, j) => {
        if (!ci.effective) return;
        // Inspire cards only benefit from other inspire cards, not themselves
        const bonus = ci.card.ability === 'inspire' ? Math.max(0, inspireBonus - 1) : inspireBonus;
        if (bonus > 0) updateBattleCardPower(j, ci.displayPower + bonus);
      });
    }, ATTACK_START - 300);
  }

  cardInfo.forEach(({ card, effective, doubled, attacks, displayPower }, i) => {
    const cardStart = t;
    // Total hits: normal attacks + 1 bonus hit if War Banner (doubled)
    const totalHits = effective ? attacks + (doubled ? 1 : 0) : 1;

    // Charge phase (or fizzle for nulled cards)
    safeTick(() => {
      document.querySelectorAll('.battle-card')[i]?.classList.add(effective ? 'attacking' : 'fizzling');
      // War Cry activates at charge start, buffing all subsequent effective cards
      if (effective && card.ability === 'war-cry') {
        warCryBonus += 1;
        showCardPop(i, 'WAR CRY!', 'warcry-pop');
        cardInfo.forEach((ci, j) => {
          if (j > i && ci.effective) {
            const iBonus = ci.card.ability === 'inspire' ? Math.max(0, inspireBonus - 1) : inspireBonus;
            updateBattleCardPower(j, ci.displayPower + warCryBonus + iBonus);
          }
        });
      }
    }, cardStart);

    if (effective) {
      const rdBonus = redirectBonus.get(i) || 0;

      for (let hit = 0; hit < totalHits; hit++) {
        const hitT        = cardStart + CHARGE_MS + hit * HIT_MS;
        const isBannerHit = doubled && hit === attacks;  // last hit = War Banner bonus
        const myInspireBonus = card.ability === 'inspire' ? Math.max(0, inspireBonus - 1) : inspireBonus;
        const hitDmg      = displayPower + warCryBonus + myInspireBonus + (hit === 0 ? rdBonus : 0);

        safeTick(() => {
          runningHp -= hitDmg;
          updateHpBar(runningHp, bossPower);
          showDamageNumber(hitDmg, isBannerHit ? 'banner' : (hit === 0 && rdBonus > 0 ? 'redirect' : false));

          const bossEl = document.getElementById('boss-card');
          if (bossEl) {
            bossEl.classList.remove('impact');
            void bossEl.offsetWidth;
            bossEl.classList.add('impact');
          }
          Music.sfx.hit(hitDmg);
        }, hitT);
      }

      // Empower: permanently boost a random other deck card after last hit (skip on replay)
      if (card.ability === 'empower') {
        safeTick(() => {
          const others = state.deck.filter(c => c.id !== card.id);
          if (others.length > 0) {
            const target = others[Math.floor(Math.random() * others.length)];
            if (!isReplay) target.power += 1;
            const tgtIdx = state.deck.indexOf(target);
            showCardPop(tgtIdx, '+1!', 'empower-pop');
            updateBattleCardPower(tgtIdx, target.power + warCryBonus);
          }
        }, cardStart + CHARGE_MS + totalHits * HIT_MS + 30);
      }

      // Mark as used after all hits
      safeTick(() => {
        const el = document.querySelectorAll('.battle-card')[i];
        if (el) { el.classList.remove('attacking'); el.classList.add('used'); }
      }, cardStart + CHARGE_MS + totalHits * HIT_MS + 40);

    } else {
      // Nulled card: fizzle, then mark used
      safeTick(() => {
        const el = document.querySelectorAll('.battle-card')[i];
        if (el) { el.classList.remove('fizzling'); el.classList.add('used'); }
        if (card.ability === 'redirect') {
          const tgt = [...redirectBonus.entries()].find(([k]) => true)?.[0];
          if (tgt !== undefined) {
            showDamageNumber(null, 'redirected');
            showRedirectBadge(tgt, card.power);
            // Flash target card so player sees who received the power
            document.querySelectorAll('.battle-card')[tgt]?.classList.add('redirect-target');
            setTimeout(() => document.querySelectorAll('.battle-card')[tgt]?.classList.remove('redirect-target'), 600);
          } else {
            showDamageNumber(null, false);
          }
        } else {
          showDamageNumber(null, false);
        }
        Music.sfx.nullified();
      }, cardStart + CHARGE_MS);
    }

    t += CHARGE_MS + totalHits * HIT_MS + GAP_MS;
  });

  const ALL_DONE = t;

  // Snap HP bar to the authoritative computed value
  safeTick(() => updateHpBar(won ? 0 : Math.max(1, bossPower - ep), bossPower), ALL_DONE + 50);

  // Ability explanation note
  if (explanation) {
    safeTick(() => document.getElementById('ability-note')?.classList.add('visible'), ALL_DONE + 120);
  }

  // Outcome banner + SFX
  const OUTCOME_T = ALL_DONE + (explanation ? 620 : 360);
  safeTick(() => {
    const bossEl = document.getElementById('boss-card');
    if (won) {
      bossEl?.classList.add('defeated');
      Music.sfx.victory();
    } else {
      bossEl?.classList.add('survived');
      Music.sfx.defeat();
    }
    const outcome = document.getElementById('battle-outcome');
    if (outcome) {
      outcome.innerHTML = won
        ? `<div class="result-banner result-win">Victory!</div><div class="reward-text">Loot a treasure from the fallen foe.</div>`
        : `<div class="result-banner result-lose">Defeated.</div>`;
      outcome.classList.add('visible');
    }
  }, OUTCOME_T);

  // Proceed button + replay button
  safeTick(() => {
    const btn = document.getElementById('btn-after-battle');
    if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
    const replayBtn = document.getElementById('btn-replay-battle');
    if (replayBtn) { replayBtn.style.opacity = '1'; replayBtn.style.pointerEvents = 'auto'; }
  }, OUTCOME_T + 780);
}

function replayBattle() {
  document.getElementById('app').innerHTML = renderBattle();
  document.getElementById('btn-replay-battle')?.addEventListener('click', replayBattle);
  document.getElementById('btn-after-battle')?.addEventListener('click', afterBattle);
  animateBattle(true);
}

function renderGameOver() {
  return `
    <div class="end-screen">
      <h1 style="color:#ff4444">Defeated</h1>
      <p>You fell in battle ${state.roomIndex + 1}.</p>
      <p>Final deck power: ${totalPower(state.deck)}</p>
      <button id="btn-restart">Try Again</button>
    </div>
  `;
}

function renderWin() {
  const relicsHTML = state.relics.length > 0
    ? `<div class="relics-row" style="justify-content:center;margin-top:6px">
        ${state.relics.map(relicChipHTML).join('')}
      </div>`
    : '';

  return `
    <div class="end-screen">
      <h1 style="color:#c9a84c">Victory!</h1>
      <p>You slew the Ancient Dragon.</p>
      <p>Final gold: ${state.gold} &nbsp;|&nbsp; Final deck power: ${totalPower(state.deck)}</p>
      <div class="final-deck card-row">
        ${state.deck.map(c => cardHTML(c, false)).join('')}
      </div>
      ${relicsHTML}
      <button id="btn-restart">Play Again</button>
    </div>
  `;
}

// ── Event wiring ──────────────────────────────────────────────────────────────

function render() {
  document.querySelectorAll('.battle-pop').forEach(el => el.remove());
  const app = document.getElementById('app');
  switch (state.phase) {
    case 'title':    app.innerHTML = renderTitle();    Music.play('title');    break;
    case 'room':     app.innerHTML = renderRoom();     Music.play('room');     break;
    case 'battle':
      app.innerHTML = renderBattle();
      setTimeout(animateBattle, 16);
      Music.play('battle');
      break;
    case 'treasure': app.innerHTML = renderTreasure(); Music.play('treasure'); break;
    case 'gameover': app.innerHTML = renderGameOver(); Music.play('gameover'); break;
    case 'win':      app.innerHTML = renderWin();      Music.play('win');      break;
  }

  const muteBtn = document.getElementById('btn-mute');
  if (muteBtn) {
    muteBtn.textContent = Music.muted ? 'Music: Off' : 'Music: On';
    muteBtn.onclick = () => {
      const on = Music.toggle();
      muteBtn.textContent = on ? 'Music: On' : 'Music: Off';
    };
  }

  document.getElementById('btn-start')?.addEventListener('click', startGame);
  document.getElementById('btn-enter-battle')?.addEventListener('click', enterBattle);
  document.getElementById('btn-after-battle')?.addEventListener('click', afterBattle);
  document.getElementById('btn-replay-battle')?.addEventListener('click', replayBattle);
  document.getElementById('btn-restart')?.addEventListener('click', init);

  document.getElementById('btn-timer-pause')?.addEventListener('click', toggleTimerPause);
  document.getElementById('btn-refresh-shop')?.addEventListener('click', refreshShop);
  document.getElementById('btn-remove-mode')?.addEventListener('click', () => setMode('remove'));
  document.getElementById('btn-upgrade-mode')?.addEventListener('click', () => setMode('upgrade'));

  document.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = state.shopCards.find(c => c.id === parseInt(btn.dataset.id));
      if (card) buyCard(card);
    });
  });

  document.querySelectorAll('.card.selectable').forEach(el => {
    el.addEventListener('click', () => {
      const card = state.deck.find(c => c.id === parseInt(el.dataset.id));
      if (card) deckCardClick(card);
    });
  });

  document.querySelectorAll('.treasure-card').forEach(el => {
    el.addEventListener('click', () => {
      const treasure = state.treasureChoices.find(t => t.id === el.dataset.id);
      if (treasure) chooseTreasure(treasure);
    });
  });

  if (state.phase === 'room') setupDeckDrag();
}

// ── Deck drag reorder ────────────────────────────────────────────────────────

function setupDeckDrag() {
  const deckRow = document.querySelector('.card-row');
  if (!deckRow) return;

  deckRow.querySelectorAll('.card').forEach(el => {
    el.setAttribute('draggable', 'true');

    el.addEventListener('dragstart', e => {
      _dragSrcId = parseInt(el.dataset.id);
      requestAnimationFrame(() => el.classList.add('dragging'));
      e.dataTransfer.effectAllowed = 'move';
      document.getElementById('card-tooltip')?.classList.remove('visible');
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      deckRow.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));
      _dragSrcId = null;
    });

    el.addEventListener('dragover', e => { e.preventDefault(); });

    el.addEventListener('dragenter', e => {
      e.preventDefault();
      if (_dragSrcId && parseInt(el.dataset.id) !== _dragSrcId) {
        el.classList.add('drag-over');
      }
    });

    el.addEventListener('dragleave', e => {
      if (!el.contains(e.relatedTarget)) el.classList.remove('drag-over');
    });

    el.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('drag-over');
      const srcId = _dragSrcId;
      const dstId = parseInt(el.dataset.id);
      if (!srcId || srcId === dstId) return;
      const srcIdx = state.deck.findIndex(c => c.id === srcId);
      const dstIdx = state.deck.findIndex(c => c.id === dstId);
      if (srcIdx < 0 || dstIdx < 0) return;
      const [moved] = state.deck.splice(srcIdx, 1);
      state.deck.splice(dstIdx, 0, moved);
      _dragSrcId = null;
      render();
    });
  });
}

// ── Card tooltip ─────────────────────────────────────────────────────────────

function setupTooltip() {
  const tip = document.getElementById('card-tooltip');
  if (!tip) return;

  function show(el) {
    const name     = el.dataset.tipName  || '';
    const power    = el.dataset.tipPower || '0';
    const tier     = parseInt(el.dataset.tipTier ?? '-1', 10);
    const desc     = el.dataset.tipDesc  || '';
    const cost     = el.dataset.tipCost;
    const nullified = el.dataset.tipNullified === 'true';

    const tierLabel = tier === 0 ? 'Starter' : tier > 0 ? `T${tier}` : '';
    const tierClass = tier === 0 ? 'ct-tier-starter'
      : tier === 1 ? 'ct-tier-t1' : tier === 2 ? 'ct-tier-t2' : 'ct-tier-t3';

    tip.innerHTML = `
      <div class="ct-header">
        <span class="ct-name">${name}</span>
        ${tierLabel ? `<span class="${tierClass}">${tierLabel}</span>` : ''}
      </div>
      <div class="ct-power-row">
        <span class="ct-power">${power}</span>
        <span class="ct-power-label">power</span>
      </div>
      ${desc ? `<hr class="ct-divider"><div class="ct-desc">${desc}</div>` : ''}
      ${cost != null ? `<div class="ct-cost">${cost} gold</div>` : ''}
      ${nullified ? `<span class="ct-nullified-tag">✕ Nullified</span>` : ''}
    `;
    tip.classList.add('visible');
  }

  function hide() { tip.classList.remove('visible'); }

  document.addEventListener('mouseover', e => {
    const card = e.target.closest('[data-tip-name]');
    if (card) show(card);
  });

  document.addEventListener('mouseout', e => {
    const card = e.target.closest('[data-tip-name]');
    if (card && !card.contains(e.relatedTarget)) hide();
  });

  document.addEventListener('mousemove', e => {
    if (!tip.classList.contains('visible')) return;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = e.clientX + 16, top = e.clientY - 12;
    if (left + tw > window.innerWidth  - 8) left = e.clientX - tw - 16;
    if (top  + th > window.innerHeight - 8) top  = window.innerHeight - th - 8;
    if (top < 8) top = 8;
    tip.style.left = left + 'px';
    tip.style.top  = top  + 'px';
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────

init();
setupTooltip();
