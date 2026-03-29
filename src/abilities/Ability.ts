import Phaser from 'phaser';
import { Enemy } from '@/entities/Enemy';
import { Player } from '@/entities/Player';

export class Ability {
    [key: string]: any;

    constructor(scene: Phaser.Scene, name: string, config: any = {}) {
        this.scene = scene;
        this.name = name;
        this.config = config;
        this.group = null;
    }

    getGroup() {
        return this.group;
    }

    update(_time: number, _player: Player) {}

    onGameOverUpdate(_time: number, _player: Player) {}

    handleEnemyOverlap(_projectile: any, _enemy: Enemy) {
        return false;
    }

    destroy() {
        if (!this.group) {
            return;
        }

        // Scene transitions can destroy group internals before this hook runs.
        // Guard clear() to avoid accessing missing children manager.
        if (this.group.children) {
            this.group.clear(true, true);
        }

        this.group = null;
    }
}
