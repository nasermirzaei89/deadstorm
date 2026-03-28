import Phaser from 'phaser';
import { GreenHill } from './stages/GreenHill';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    title: 'Deadstorm',
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: [
        GreenHill
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
};

new Phaser.Game(config);
