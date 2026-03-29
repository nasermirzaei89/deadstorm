import Phaser from 'phaser';
import { Ability } from '@/abilities/Ability';
import { BoomerangMissile } from '@/abilities/BoomerangMissile';
import { Enemy } from '@/entities/Enemy';
import { EnemyManager } from '@/enemies/EnemyManager';
import { GAMEPLAY } from '@/config/gameplay';
import { Player } from '@/entities/Player';

export class Boomerang extends Ability {
    [key: string]: any;

    constructor(
        scene: Phaser.Scene,
        enemyManager: EnemyManager,
        config: any = {},
        textureKey = 'boomerang',
    ) {
        const defaults = GAMEPLAY.abilities.boomerang;
        const mergedConfig = {
            ...defaults,
            ...config,
        };

        super(scene, 'Boomerang', mergedConfig);

        this.enemyManager = enemyManager;
        this.textureKey = textureKey;
        this.nextFireAt = 0;
        this.pendingShots = [];

        this.group = this.scene.physics.add.group({
            classType: BoomerangMissile,
            maxSize: this.config.maxInGame,
            runChildUpdate: false,
        });
    }

    update(time: number, player: Player) {
        if (time >= this.nextFireAt) {
            this.fireFromPlayer(player);
            this.nextFireAt = time + this.config.cooldown;
        }

        this.firePendingShots(time, player);
        this.updateActiveMissiles(player);
    }

    onGameOverUpdate(_time: number, player: Player) {
        this.updateActiveMissiles(player);
    }

    fireFromPlayer(player: Player) {
        const count = Math.max(1, Number(this.config.count ?? 1));
        const activeCount = this.group
            .getChildren()
            .filter((missile) => missile.active).length;
        const spawnCount = Math.max(0, count - activeCount);

        if (spawnCount <= 0) {
            return;
        }

        const shotDelayMs = Math.max(0, Number(this.config.shotDelayMs ?? 120));
        const spawnX = player.x;
        const spawnY = player.y;
        const randomBaseAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const angleStep = (Math.PI * 2) / count;
        const startSlot = activeCount % count;
        const now = this.scene.time.now;

        for (let i = 0; i < spawnCount; i += 1) {
            const slotIndex = (startSlot + i) % count;
            const angleOffset = slotIndex * angleStep;

            this.pendingShots.push({
                fireAt: now + i * shotDelayMs,
                baseAngle: randomBaseAngle + angleOffset,
                curveSign: Phaser.Math.Between(0, 1) === 0 ? -1 : 1,
                x: spawnX,
                y: spawnY,
            });
        }
    }

    firePendingShots(time: number, player: Player) {
        if (!this.pendingShots.length) {
            return;
        }

        const count = Math.max(1, Number(this.config.count ?? 1));

        this.pendingShots.sort((a: any, b: any) => a.fireAt - b.fireAt);

        while (this.pendingShots.length) {
            const next = this.pendingShots[0];

            if (next.fireAt > time) {
                break;
            }

            const activeCount = this.group
                .getChildren()
                .filter((missile) => missile.active).length;

            if (activeCount >= count) {
                next.fireAt = time + 50;
                break;
            }

            const missile = this.group.get(next.x, next.y, this.textureKey);

            this.pendingShots.shift();

            if (!missile) {
                continue;
            }

            missile.activateFromPool(next.x, next.y, {
                baseAngle: next.baseAngle,
                duration: this.config.duration,
                speed: this.config.speed,
                range: this.config.range,
                roseK: this.config.roseK,
                spinSpeed: this.config.spinSpeed,
                damage: this.config.damage,
                scaleFactor: this.config.scaleFactor,
                body: this.config.body ?? null,
                centerX: player.x,
                centerY: player.y,
                curveSign: next.curveSign,
            });
        }
    }

    updateActiveMissiles(player: Player) {
        const deltaMs = this.scene.game.loop.delta;
        const enemies = this.enemyManager
            .getGroup()
            .getChildren()
            .filter((enemy) => enemy.active) as Enemy[];

        for (const missile of this.group.getChildren()) {
            if (!missile.active) {
                continue;
            }

            missile.updateMotion(deltaMs, player);
            missile.refreshTouchingEnemies(enemies);
        }
    }

    handleEnemyOverlap(missile: BoomerangMissile, enemy: Enemy) {
        if (!missile.active || !enemy.active || !enemy.isAlive) {
            return false;
        }

        if (!missile.canDamageEnemy(enemy.enemyId)) {
            return false;
        }

        missile.markEnemyTouch(enemy.enemyId);
        return enemy.takeDamage(this.config.damage);
    }
}
