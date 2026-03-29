export type CharacterDefinition = {
    id: string;
    name: string;
    textureKey: string;
    speed: number;
    maxHealth: number;
    abilities: string[];
};

export const CHARACTERS: CharacterDefinition[] = [
    {
        id: 'shadow-hunter',
        name: 'Shadow Hunter',
        textureKey: 'character1',
        speed: 510,
        maxHealth: 120,
        abilities: ['Boomerang'],
    },
    {
        id: 'ranger',
        name: 'Ranger',
        textureKey: 'character2',
        speed: 560,
        maxHealth: 95,
        abilities: ['Gun'],
    },
    {
        id: 'wizard',
        name: 'Wizard',
        textureKey: 'character3',
        speed: 460,
        maxHealth: 140,
        abilities: ['Gun', 'Boomerang'],
    },
];
