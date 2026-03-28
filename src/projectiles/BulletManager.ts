import Phaser from 'phaser';
import { GAMEPLAY } from '@/config/gameplay';
import { Bullet } from './Bullet';
import { Enemy } from '@/entities/Enemy';
import { Player } from '@/entities/Player';

export class BulletManager {
    [key: string]: any;

    constructor(scene: Phaser.Scene, config = {}, textureKey = 'bullet') {
        this.scene = scene;
        this.textureKey = textureKey;
        this.config = {
            ...GAMEPLAY.bullets,
            ...config
        };
        this.nextFireAt = 0;
        this.spawnPosition = new Phaser.Math.Vector2();

        this.group = this.scene.physics.add.group({
            classType: Bullet,
            maxSize: this.config.maxInGame,
            runChildUpdate: false
        });
    }

    update(time, player: Player) {
        if (time >= this.nextFireAt) {
            this.fireFromPlayer(player);
            this.nextFireAt = time + this.config.cooldown;
        }

        this.cullOutsideCamera();
    }

    fireFromPlayer(player: Player) {
        if (this.group.countActive(true) >= this.config.maxInGame) {
            return;
        }

        const count = this.config.count;
        const baseAngle = player.getFacingAngle();
        const spread = this.config.spread;
        const spawn = player.getMuzzlePosition(this.spawnPosition);

        for (let i = 0; i < count; i += 1) {
            let angleOffset = 0;

            if (count > 1) {
                const t = i / (count - 1);
                angleOffset = -spread / 2 + t * spread;
            }

            const bullet = this.group.get(spawn.x, spawn.y, this.textureKey);

            if (!bullet) {
                continue;
            }

            const shotAngle = baseAngle + angleOffset;
            const faceDirection = Math.cos(shotAngle) < 0 ? -1 : 1;

            bullet.activateFromPool(
                spawn.x,
                spawn.y,
                shotAngle,
                this.config.speed,
                this.config.damage,
                this.config.pierce,
                this.config.scaleFactor,
                faceDirection,
                this.config.body ?? null
            );
        }
    }

    handleBulletEnemyOverlap(bullet: Bullet, enemy: Enemy) {
        if (!bullet.active || !enemy.active || !enemy.isAlive) {
            return false;
        }

        if (!bullet.canHitEnemy(enemy.enemyId)) {
            return false;
        }

        bullet.markEnemyHit(enemy.enemyId);
        const wasKilled = enemy.takeDamage(bullet.damage);

        if (bullet.pierce < 0) {
            bullet.deactivateToPool();
        }

        return wasKilled;
    }

    cullOutsideCamera() {
        const view = this.scene.cameras.main.worldView;
        const buffer = this.config.despawnBuffer;
        const left = view.x - buffer;
        const right = view.right + buffer;
        const top = view.y - buffer;
        const bottom = view.bottom + buffer;

        for (const bullet of this.group.getChildren()) {
            if (!bullet.active) {
                continue;
            }

            if (bullet.x < left || bullet.x > right || bullet.y < top || bullet.y > bottom) {
                bullet.deactivateToPool();
            }
        }
    }

}
