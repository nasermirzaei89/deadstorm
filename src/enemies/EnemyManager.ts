import { Enemy } from '@/entities/Enemy';
import { GAMEPLAY } from '@/config/gameplay';

export class EnemyManager {
    [key: string]: any;

    constructor(scene: Phaser.Scene, config: any = {}) {
        this.scene = scene;

        const defaults = GAMEPLAY.enemies;

        this.config = {
            ...defaults,
            ...config,
            enemyTypes: {
                ...defaults.enemyTypes,
                ...(config.enemyTypes ?? {}),
            },
        };

        this.group = this.scene.physics.add.group({
            classType: Enemy,
            maxSize: this.config.maxInGame,
            runChildUpdate: false,
        });
    }

    update(player, showEnemyHealthBars) {
        for (const enemy of this.group.getChildren()) {
            if (!enemy.active) {
                continue;
            }

            enemy.updateChase(player, showEnemyHealthBars);
        }

        this.cullOutsideCamera();
    }

    getGroup() {
        return this.group;
    }

    countActive() {
        return this.group.countActive(true);
    }

    canSpawn() {
        return this.countActive() < this.config.maxInGame;
    }

    spawnEnemy(typeKey, x, y, showEnemyHealthBars = false) {
        if (!this.canSpawn()) {
            return null;
        }

        const enemyTypeConfig = this.config.enemyTypes[typeKey];

        if (!enemyTypeConfig) {
            return null;
        }

        const enemy = this.group.get(x, y, typeKey);

        if (!enemy) {
            return null;
        }

        enemy.activateFromPool(
            x,
            y,
            typeKey,
            enemyTypeConfig,
            showEnemyHealthBars,
        );
        return enemy;
    }

    cullOutsideCamera() {
        const view = this.scene.cameras.main.worldView;
        const buffer = this.config.despawnBuffer;
        const left = view.x - buffer;
        const right = view.right + buffer;
        const top = view.y - buffer;
        const bottom = view.bottom + buffer;

        for (const enemy of this.group.getChildren()) {
            if (!enemy.active) {
                continue;
            }

            if (
                enemy.x < left ||
                enemy.x > right ||
                enemy.y < top ||
                enemy.y > bottom
            ) {
                enemy.deactivateToPool();
            }
        }
    }
}
