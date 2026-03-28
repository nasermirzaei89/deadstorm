import Phaser from 'phaser';
import { GAMEPLAY } from '@/config/gameplay';
import { EnemyManager } from './EnemyManager';

export class EnemySpawner {
    [key: string]: any;

    constructor(scene: Phaser.Scene, enemyManager: EnemyManager, config: any = {}) {
        this.scene = scene;
        this.enemyManager = enemyManager;

        const defaults = GAMEPLAY.spawner;

        this.config = {
            ...defaults,
            ...config,
            timeline: (config.timeline ?? defaults.timeline).map((entry) => ({ ...entry }))
        };

        this.entryStates = this.config.timeline.map(() => ({
            accumulator: 0
        }));

        this.lastUpdateTime = null;
    }

    update(timeMs, showEnemyHealthBars) {
        if (this.lastUpdateTime === null) {
            this.lastUpdateTime = timeMs;
            return;
        }

        const deltaSeconds = Math.max(0, (timeMs - this.lastUpdateTime) / 1000);
        this.lastUpdateTime = timeMs;

        const elapsedSeconds = Math.floor(timeMs / 1000);

        for (let i = 0; i < this.config.timeline.length; i += 1) {
            const entry = this.config.timeline[i];

            if (elapsedSeconds < entry.startAt || elapsedSeconds >= entry.endAt) {
                continue;
            }

            const state = this.entryStates[i];
            state.accumulator += deltaSeconds * entry.ratePerSecond;

            while (state.accumulator >= 1) {
                state.accumulator -= 1;
                this.spawnBatch(entry, showEnemyHealthBars);
            }
        }
    }

    spawnBatch(entry, showEnemyHealthBars) {
        for (let i = 0; i < entry.countPerSpawn; i += 1) {
            if (!this.enemyManager.canSpawn()) {
                return;
            }

            const enemyType = this.pickEnemyType(entry.enemyPool);
            const spawnPos = this.getSpawnPositionAroundView();
            this.enemyManager.spawnEnemy(enemyType, spawnPos.x, spawnPos.y, showEnemyHealthBars);
        }
    }

    pickEnemyType(pool) {
        const index = Phaser.Math.Between(0, pool.length - 1);
        return pool[index];
    }

    getSpawnPositionAroundView() {
        const view = this.scene.cameras.main.worldView;
        const margin = this.config.spawnMargin;
        const side = Phaser.Math.Between(0, 3);

        if (side === 0) {
            return {
                x: Phaser.Math.Between(Math.floor(view.x), Math.floor(view.right)),
                y: Math.floor(view.y - margin)
            };
        }

        if (side === 1) {
            return {
                x: Phaser.Math.Between(Math.floor(view.x), Math.floor(view.right)),
                y: Math.floor(view.bottom + margin)
            };
        }

        if (side === 2) {
            return {
                x: Math.floor(view.x - margin),
                y: Phaser.Math.Between(Math.floor(view.y), Math.floor(view.bottom))
            };
        }

        return {
            x: Math.floor(view.right + margin),
            y: Phaser.Math.Between(Math.floor(view.y), Math.floor(view.bottom))
        };
    }

}
