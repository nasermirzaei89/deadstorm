import { BaseStage } from '@/stages/BaseStage';
import groundAsset from '@/assets/ground.png';
import playerAsset from '@/assets/player.png';
import bulletAsset from '@/assets/bullet.png';
import enemy1Asset from '@/assets/enemy1.png';
import enemy2Asset from '@/assets/enemy2.png';
import enemy3Asset from '@/assets/enemy3.png';
import killsAsset from '@/assets/kills.png';

export class GreenHill extends BaseStage {
    constructor() {
        super('GreenHill');
    }

    preloadAssets() {
        this.load.image('background', groundAsset);
        this.load.image('player', playerAsset);
        this.load.image('bullet', bulletAsset);
        this.load.image('enemy1', enemy1Asset);
        this.load.image('enemy2', enemy2Asset);
        this.load.image('enemy3', enemy3Asset);
        this.load.image('kills', killsAsset);
    }
}
