import Phaser from 'phaser';
import { CollidableBody } from '@/entities/CollidableBody';

export class Bullet extends Phaser.Physics.Arcade.Image {
    [key: string]: any;

    constructor(scene: Phaser.Scene, x: number, y: number, texture = 'bullet', frame?: string | number) {
        super(scene, x, y, texture, frame);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setActive(false);
        this.setVisible(false);
        this.body.enable = false;

        this.damage = 0;
        this.scaleFactor = 1;
        this.faceDirection = 1;
        this.pierce = 0;
        this.hitEnemyIds = new Set();
        this._bodyConfig = null;
        this._collidableBody = new CollidableBody(this);
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

    activateFromPool(x: number, y: number, angle: number, speed: number, damage: number, pierce: number, scaleFactor = 1, faceDirection = 1, bodyConfig: any = null) {
        this._bodyConfig = bodyConfig;
        this.setActive(true);
        this.setVisible(true);
        this.body.enable = true;
        this.body.reset(x, y);
        this.setVisualTransform(scaleFactor, faceDirection);
        this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);

        this.damage = damage;
        this.pierce = pierce;
        this.hitEnemyIds.clear();
    }

    canHitEnemy(enemyId: number) {
        return !this.hitEnemyIds.has(enemyId);
    }

    markEnemyHit(enemyId: number) {
        this.hitEnemyIds.add(enemyId);
        this.pierce -= 1;
    }

    deactivateToPool() {
        this.setActive(false);
        this.setVisible(false);
        this.body.stop();
        this.body.enable = false;

        this.damage = 0;
        this.pierce = 0;
        this.hitEnemyIds.clear();
    }

}
