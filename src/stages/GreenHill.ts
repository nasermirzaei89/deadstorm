import { BaseStage } from './BaseStage';

export class GreenHill extends BaseStage {

    constructor() {
        super('GreenHill');
    }

    // -------------------------------------------------------------------------
    // Stage-specific asset loading
    // -------------------------------------------------------------------------

    preloadAssets() {
        this.load.image('background', 'assets/ground.png');
        this.load.image('player', 'assets/player.png');
        this.load.image('bullet', 'assets/bullet.png');
        this.load.image('enemy1', 'assets/enemy1.png');
        this.load.image('enemy2', 'assets/enemy2.png');
        this.load.image('enemy3', 'assets/enemy3.png');
        this.load.image('kills', 'assets/kills.png');
    }
}
