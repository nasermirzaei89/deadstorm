import Phaser from 'phaser';
import { CollidableBody } from '@/entities/CollidableBody';
import { Enemy } from '@/entities/Enemy';
import { Player } from '@/entities/Player';

export class BoomerangMissile extends Phaser.Physics.Arcade.Image {
    [key: string]: any;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture = 'boomerang',
        frame?: string | number,
    ) {
        super(scene, x, y, texture, frame);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setActive(false);
        this.setVisible(false);
        this.body.enable = false;

        this.damage = 0;
        this.scaleFactor = 1;
        this.faceDirection = 1;
        this._bodyConfig = null;
        this._collidableBody = new CollidableBody(this);

        this.elapsedMs = 0;
        this.durationMs = 1000;
        this.speed = 260;
        this.range = 220;
        this.curveAmplitude = 70;
        this.roseK = 2;
        this.curveSign = 1;
        this.travelDistance = 0;
        this.spinSpeed = 0.02;
        this.baseAngle = 0;
        this.centerX = 0;
        this.centerY = 0;

        this.touchingEnemyIds = new Set<number>();
    }

    setVisualTransform(scaleFactor: number, faceDirection = 1) {
        const numericScale = Number.isFinite(scaleFactor) ? scaleFactor : 1;
        const normalizedScale = Math.max(0.01, Math.abs(numericScale));
        const signedScale = (numericScale < 0 ? -1 : 1) * normalizedScale;

        const normalizedFaceDirection = faceDirection < 0 ? -1 : 1;
        const baseFacing = numericScale < 0 ? -1 : 1;
        const effectiveFacing = normalizedFaceDirection * baseFacing;

        this.scaleFactor = signedScale;
        this.faceDirection = effectiveFacing;
        this.setScale(normalizedScale, normalizedScale);
        this.setFlipX(this.faceDirection < 0);

        if (this.body) {
            this._collidableBody.apply(this._bodyConfig);
        }
    }

    activateFromPool(x: number, y: number, options: any) {
        this.setActive(true);
        this.setVisible(true);
        this.body.enable = true;
        this.body.reset(x, y);
        this.body.stop();

        this.elapsedMs = 0;
        this.centerX = Number(options.centerX ?? x);
        this.centerY = Number(options.centerY ?? y);
        this.baseAngle = options.baseAngle ?? 0;
        this.durationMs = Math.max(100, Number(options.duration ?? 1000));
        this.speed = Math.max(1, Number(options.speed ?? 260));
        this.range = Math.max(20, Number(options.range ?? 220));
        this.roseK = Math.max(0.1, Number(options.roseK ?? 2));
        this.curveSign = Number(options.curveSign ?? 1) < 0 ? -1 : 1;
        this.travelDistance = 0;
        this.spinSpeed = Number(options.spinSpeed ?? 0.02);
        this.damage = Number(options.damage ?? 0);
        this._bodyConfig = options.body ?? null;

        this.setVisualTransform(options.scaleFactor ?? 1, 1);
        this.touchingEnemyIds.clear();
        this.updateMotion(0);
    }

    updateMotion(deltaMs: number, player?: Player) {
        if (!this.active) {
            return;
        }

        this.elapsedMs += Math.max(0, deltaMs);

        if (this.elapsedMs >= this.durationMs) {
            this.deactivateToPool();
            return;
        }

        if (player?.active) {
            this.centerX = player.x;
            this.centerY = player.y;
        }

        const deltaSeconds = Math.max(0, deltaMs) / 1000;
        this.travelDistance += this.speed * deltaSeconds;

        // Rhodonea (rose) curve in local polar coordinates.
        // r = a * sin(k * theta), where a=range and k=roseK.
        const safeRange = Math.max(1, this.range);
        const theta = (this.travelDistance / safeRange) * this.curveSign;
        const radius = this.range * Math.sin(this.roseK * theta);

        const forwardDistance = radius * Math.cos(theta);
        const lateralDistance = radius * Math.sin(theta);

        const dirX = Math.cos(this.baseAngle);
        const dirY = Math.sin(this.baseAngle);
        const perpX = -dirY;
        const perpY = dirX;

        const nextX =
            this.centerX + dirX * forwardDistance + perpX * lateralDistance;
        const nextY =
            this.centerY + dirY * forwardDistance + perpY * lateralDistance;

        this.setPosition(nextX, nextY);

        if (this.body?.updateFromGameObject) {
            this.body.updateFromGameObject();
        }

        this.rotation += this.spinSpeed * deltaMs;
    }

    canDamageEnemy(enemyId: number) {
        return !this.touchingEnemyIds.has(enemyId);
    }

    markEnemyTouch(enemyId: number) {
        this.touchingEnemyIds.add(enemyId);
    }

    refreshTouchingEnemies(enemies: Enemy[]) {
        if (!this.active || !this.body) {
            this.touchingEnemyIds.clear();
            return;
        }

        const body = this.body as Phaser.Physics.Arcade.Body;

        for (const enemyId of Array.from(this.touchingEnemyIds)) {
            const enemy = enemies.find((item) => item.enemyId === enemyId);

            if (!enemy || !enemy.active || !enemy.body) {
                this.touchingEnemyIds.delete(enemyId);
                continue;
            }

            const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
            const overlaps =
                body.right >= enemyBody.left &&
                body.left <= enemyBody.right &&
                body.bottom >= enemyBody.top &&
                body.top <= enemyBody.bottom;

            if (!overlaps) {
                this.touchingEnemyIds.delete(enemyId);
            }
        }
    }

    deactivateToPool() {
        this.setActive(false);
        this.setVisible(false);
        this.body.stop();
        this.body.enable = false;

        this.elapsedMs = 0;
        this.travelDistance = 0;
        this.touchingEnemyIds.clear();
    }
}
