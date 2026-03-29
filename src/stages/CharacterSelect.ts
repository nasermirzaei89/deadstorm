import Phaser from 'phaser';
import { CHARACTERS } from '@/config/characters';
import character1Asset from '@/assets/characters/character1.png';
import character2Asset from '@/assets/characters/character2.png';
import character3Asset from '@/assets/characters/character3.png';
import bulletAsset from '@/assets/bullet.png';
import boomerangAsset from '@/assets/boomerang.png';

export class CharacterSelect extends Phaser.Scene {
    [key: string]: any;

    constructor() {
        super('CharacterSelect');

        this.selectedIndex = 0;
        this.cards = [];
        this.cardHighlights = [];
    }

    preload() {
        this.load.image('character1', character1Asset);
        this.load.image('character2', character2Asset);
        this.load.image('character3', character3Asset);
        this.load.image('bullet', bulletAsset);
        this.load.image('boomerang', boomerangAsset);
    }

    create() {
        const width = Number(this.scale.width);
        const height = Number(this.scale.height);

        this.add.rectangle(width / 2, height / 2, width, height, 0x0b1020, 1);

        this.add
            .text(width / 2, 44, 'Choose Your Character', {
                fontFamily: 'Courier New, monospace',
                fontSize: '38px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 5,
            })
            .setOrigin(0.5);

        this.add
            .text(
                width / 2,
                86,
                'Arrow/A-D to move, Enter/Space or Click to select',
                {
                    fontFamily: 'Courier New, monospace',
                    fontSize: '16px',
                    color: '#9bb2d1',
                },
            )
            .setOrigin(0.5);

        const cardWidth = 300;
        const cardHeight = 430;
        const gap = 26;
        const totalWidth =
            CHARACTERS.length * cardWidth + (CHARACTERS.length - 1) * gap;
        const startX = (width - totalWidth) / 2;
        const y = 135;

        for (let i = 0; i < CHARACTERS.length; i += 1) {
            const character = CHARACTERS[i];
            const x = startX + i * (cardWidth + gap);

            const cardBg = this.add
                .rectangle(
                    x + cardWidth / 2,
                    y + cardHeight / 2,
                    cardWidth,
                    cardHeight,
                    0x111827,
                    0.95,
                )
                .setOrigin(0.5)
                .setStrokeStyle(2, 0x3b82f6, 0.75)
                .setInteractive({ useHandCursor: true });

            const highlight = this.add
                .rectangle(
                    x + cardWidth / 2,
                    y + cardHeight / 2,
                    cardWidth + 8,
                    cardHeight + 8,
                    0x000000,
                    0,
                )
                .setOrigin(0.5)
                .setStrokeStyle(4, 0x7dd3fc, 1)
                .setVisible(false);

            const portrait = this.add
                .image(x + cardWidth / 2, y + 128, character.textureKey)
                .setScale(2.4);

            const nameText = this.add
                .text(x + cardWidth / 2, y + 228, character.name, {
                    fontFamily: 'Courier New, monospace',
                    fontSize: '24px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 4,
                })
                .setOrigin(0.5);

            const statsText = this.add
                .text(
                    x + 20,
                    y + 268,
                    `Speed: ${character.speed}\nHealth: ${character.maxHealth}`,
                    {
                        fontFamily: 'Courier New, monospace',
                        fontSize: '19px',
                        color: '#cbd5e1',
                        lineSpacing: 8,
                    },
                )
                .setOrigin(0, 0);

            const abilitiesLabel = this.add
                .text(x + 20, y + 342, 'Abilities:', {
                    fontFamily: 'Courier New, monospace',
                    fontSize: '18px',
                    color: '#93c5fd',
                })
                .setOrigin(0, 0);

            const abilityIconY = y + 390;
            let iconX = x + 24;

            for (const ability of character.abilities) {
                const key = ability === 'Gun' ? 'bullet' : 'boomerang';

                const box = this.add
                    .rectangle(
                        iconX + 18,
                        abilityIconY + 18,
                        36,
                        36,
                        0x1f2937,
                        1,
                    )
                    .setStrokeStyle(2, 0x60a5fa, 1);

                const icon = this.add.image(iconX + 18, abilityIconY + 18, key);
                const scale = Math.min(
                    24 / Math.max(1, icon.width),
                    24 / Math.max(1, icon.height),
                );
                icon.setScale(scale);

                iconX += 44;

                this.cards.push(box, icon);
            }

            cardBg.on('pointerover', () => this.setSelected(i));
            cardBg.on('pointerdown', () => {
                this.setSelected(i);
                this.startGameWithSelected();
            });

            this.cards.push(
                cardBg,
                portrait,
                nameText,
                statsText,
                abilitiesLabel,
            );
            this.cardHighlights.push(highlight);
        }

        this.input.keyboard.on('keydown-LEFT', this.handlePrev, this);
        this.input.keyboard.on('keydown-A', this.handlePrev, this);
        this.input.keyboard.on('keydown-RIGHT', this.handleNext, this);
        this.input.keyboard.on('keydown-D', this.handleNext, this);
        this.input.keyboard.on(
            'keydown-ENTER',
            this.startGameWithSelected,
            this,
        );
        this.input.keyboard.on(
            'keydown-SPACE',
            this.startGameWithSelected,
            this,
        );

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
        this.setSelected(0);
    }

    handlePrev() {
        const next =
            (this.selectedIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
        this.setSelected(next);
    }

    handleNext() {
        const next = (this.selectedIndex + 1) % CHARACTERS.length;
        this.setSelected(next);
    }

    setSelected(index: number) {
        this.selectedIndex = Phaser.Math.Clamp(index, 0, CHARACTERS.length - 1);

        for (let i = 0; i < this.cardHighlights.length; i += 1) {
            this.cardHighlights[i].setVisible(i === this.selectedIndex);
        }
    }

    startGameWithSelected() {
        const selected = CHARACTERS[this.selectedIndex];

        this.scene.start('GreenHill', {
            selectedCharacterId: selected.id,
        });
    }

    onShutdown() {
        this.input.keyboard.off('keydown-LEFT', this.handlePrev, this);
        this.input.keyboard.off('keydown-A', this.handlePrev, this);
        this.input.keyboard.off('keydown-RIGHT', this.handleNext, this);
        this.input.keyboard.off('keydown-D', this.handleNext, this);
        this.input.keyboard.off(
            'keydown-ENTER',
            this.startGameWithSelected,
            this,
        );
        this.input.keyboard.off(
            'keydown-SPACE',
            this.startGameWithSelected,
            this,
        );
    }
}
