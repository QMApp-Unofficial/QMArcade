import type { GachaCharacter } from "@qmul/shared";

function art(dex: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dex}.png`;
}

function mk(dex: number, name: string, rarity: GachaCharacter["rarity"]): GachaCharacter {
  return {
    id: `p_${dex}`,
    name,
    image: art(dex),
    rarity,
    source: "Pokémon",
  };
}

export const CHARACTERS: GachaCharacter[] = [
  mk(1, "Bulbasaur", "common"),
  mk(4, "Charmander", "common"),
  mk(7, "Squirtle", "common"),
  mk(10, "Caterpie", "common"),
  mk(16, "Pidgey", "common"),
  mk(19, "Rattata", "common"),
  mk(25, "Pikachu", "common"),
  mk(39, "Jigglypuff", "common"),
  mk(50, "Diglett", "common"),
  mk(52, "Meowth", "common"),
  mk(54, "Psyduck", "common"),
  mk(63, "Abra", "common"),
  mk(66, "Machop", "common"),
  mk(92, "Gastly", "common"),
  mk(104, "Cubone", "common"),
  mk(129, "Magikarp", "common"),
  mk(147, "Dratini", "common"),
  mk(155, "Cyndaquil", "common"),
  mk(158, "Totodile", "common"),
  mk(175, "Togepi", "common"),
  mk(255, "Torchic", "common"),
  mk(258, "Mudkip", "common"),
  mk(390, "Chimchar", "common"),
  mk(393, "Piplup", "common"),
  mk(501, "Oshawott", "common"),
  mk(656, "Froakie", "common"),
  mk(813, "Scorbunny", "common"),

  mk(3, "Venusaur", "rare"),
  mk(6, "Charizard", "rare"),
  mk(9, "Blastoise", "rare"),
  mk(26, "Raichu", "rare"),
  mk(38, "Ninetales", "rare"),
  mk(59, "Arcanine", "rare"),
  mk(65, "Alakazam", "rare"),
  mk(68, "Machamp", "rare"),
  mk(94, "Gengar", "rare"),
  mk(130, "Gyarados", "rare"),
  mk(131, "Lapras", "rare"),
  mk(133, "Eevee", "rare"),
  mk(143, "Snorlax", "rare"),
  mk(196, "Espeon", "rare"),
  mk(197, "Umbreon", "rare"),
  mk(282, "Gardevoir", "rare"),

  mk(149, "Dragonite", "epic"),
  mk(214, "Heracross", "epic"),
  mk(230, "Kingdra", "epic"),
  mk(248, "Tyranitar", "epic"),
  mk(373, "Salamence", "epic"),
  mk(376, "Metagross", "epic"),
  mk(445, "Garchomp", "epic"),
  mk(635, "Hydreigon", "epic"),
  mk(706, "Goodra", "epic"),
  mk(887, "Dragapult", "epic"),

  mk(144, "Articuno", "legendary"),
  mk(145, "Zapdos", "legendary"),
  mk(146, "Moltres", "legendary"),
  mk(150, "Mewtwo", "legendary"),
  mk(151, "Mew", "legendary"),
  mk(249, "Lugia", "legendary"),
  mk(250, "Ho-Oh", "legendary"),
  mk(384, "Rayquaza", "legendary"),
];

export const CHARACTERS_BY_ID: Record<string, GachaCharacter> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c]),
);
