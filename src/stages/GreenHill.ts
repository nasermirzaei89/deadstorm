import { BaseStage } from '@/stages/BaseStage';
import grassAsset from '@/assets/grass.png';
import character1Asset from '@/assets/characters/character1.png';
import character2Asset from '@/assets/characters/character2.png';
import character3Asset from '@/assets/characters/character3.png';
import bulletAsset from '@/assets/bullet.png';
import boomerangAsset from '@/assets/boomerang.png';
import enemy1Asset from '@/assets/enemies/enemy1.png';
import enemy2Asset from '@/assets/enemies/enemy2.png';
import enemy3Asset from '@/assets/enemies/enemy3.png';
import killsAsset from '@/assets/kills.png';

export class GreenHill extends BaseStage {
    constructor() {
        super('GreenHill');
    }

    preloadAssets() {
        this.load.image('background', grassAsset);
        this.load.image('player', character1Asset);
        this.load.image('character1', character1Asset);
        this.load.image('character2', character2Asset);
        this.load.image('character3', character3Asset);
        this.load.image('bullet', bulletAsset);
        this.load.image('boomerang', boomerangAsset);
        this.load.image('enemy1', enemy1Asset);
        this.load.image('enemy2', enemy2Asset);
        this.load.image('enemy3', enemy3Asset);
        this.load.image('kills', killsAsset);
    }
}
