import Phaser from 'phaser';
import { GAMEPLAY } from '@/config/gameplay';
import { Ability } from '@/abilities/Ability';
import { Enemy } from '@/entities/Enemy';
import { Player } from '@/entities/Player';
import { GunShot } from '@/abilities/GunShot';

export class Gun extends Ability {
    [key: string]: any;

    constructor(scene: Phaser.Scene, config: any = {}, textureKey = 'bullet') {
        const defaults = GAMEPLAY.abilities.gun;
        const mergedConfig = {
            ...defaults,
            ...config,
        };

        super(scene, 'Gun', mergedConfig);

        this.textureKey = textureKey;
        this.nextFireAt = 0;
        this.spawnPosition = new Phaser.Math.Vector2();

        this.group = this.scene.physics.add.group({
            classType: GunShot,
            maxSize: this.config.maxInGame,
            runChildUpdate: false,
        });
    }

    update(time: number, player: Player) {
        if (time >= this.nextFireAt) {
            this.fireFromPlayer(player);
            this.nextFireAt = time + this.config.cooldown;
        }

        this.cullOutsideCamera();
    }

    onGameOverUpdate(_time: number, _player: Player) {
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

            const shot = this.group.get(spawn.x, spawn.y, this.textureKey);

            if (!shot) {
                continue;
            }

            const shotAngle = baseAngle + angleOffset;
            const faceDirection = Math.cos(shotAngle) < 0 ? -1 : 1;

            shot.activateFromPool(
                spawn.x,
                spawn.y,
                shotAngle,
                this.config.speed,
                this.config.damage,
                this.config.pierce,
                this.config.scaleFactor,
                faceDirection,
                this.config.body ?? null,
            );
        }
    }

    handleEnemyOverlap(shot: GunShot, enemy: Enemy) {
        if (!shot.active || !enemy.active || !enemy.isAlive) {
            return false;
        }

        if (!shot.canHitEnemy(enemy.enemyId)) {
            return false;
        }

        shot.markEnemyHit(enemy.enemyId);
        const wasKilled = enemy.takeDamage(shot.damage);

        if (shot.pierce < 0) {
            shot.deactivateToPool();
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

        for (const shot of this.group.getChildren()) {
            if (!shot.active) {
                continue;
            }

            if (
                shot.x < left ||
                shot.x > right ||
                shot.y < top ||
                shot.y > bottom
            ) {
                shot.deactivateToPool();
            }
        }
    }
}
