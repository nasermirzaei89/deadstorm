import Phaser from 'phaser';
import { HealthBar } from '@/ui/HealthBar';
import { GAMEPLAY } from '@/config/gameplay';
import { CollidableBody } from './CollidableBody';
import { Player } from './Player';

let NEXT_ENEMY_ID = 1;

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    [key: string]: any;

    constructor(scene: Phaser.Scene, x: number, y: number, texture = 'enemy1', frame?: string | number) {
        super(scene, x, y, texture, frame);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.enemyId = NEXT_ENEMY_ID;
        this.enemyType = texture;
        this.speed = 0;
        this.scaleFactor = 1;
        this.faceDirection = 1;
        this.maxHealth = 1;
        this.health = 1;
        this.damage = 0;
        this.xpYield = 0;
        this.isAlive = false;
        this.lastDamageAt = 0;
        this._bodyConfig = null;
        this._collidableBody = new CollidableBody(this);
        this._chaseDirection = new Phaser.Math.Vector2(0, 0);

        this.healthBar = new HealthBar(scene, {
            ...GAMEPLAY.enemies.healthBar,
            width: 34,
            visible: false
        });

        this.setActive(false);
        this.setVisible(false);
        this.body.enable = false;
    }

    activateFromPool(x: number, y: number, texture: string, config: any, showHealthBar = false) {
        this.enemyId = NEXT_ENEMY_ID;
        NEXT_ENEMY_ID += 1;

        this.enemyType = texture;
        this.setTexture(texture);

        this.speed = config.speed;
        this.maxHealth = config.maxHealth;
        this.health = config.maxHealth;
        this.damage = config.damage;
        const rawXpYield = Number(config.xpYield);
        this.xpYield = Number.isFinite(rawXpYield) ? rawXpYield : 0;
        this.isAlive = true;
        this.lastDamageAt = 0;
        this._bodyConfig = config.body ?? null;

        this.setActive(true);
        this.setVisible(true);
        this.body.enable = true;
        this.body.reset(x, y);
        this.setVisualTransform(config.scaleFactor ?? 1, 1);

        this.healthBar.setPercent(1);
        this.healthBar.setWidth(Math.abs(this.displayWidth));
        this.healthBar.setVisible(showHealthBar);
    }

    updateChase(player: Player, showHealthBar: boolean) {
        if (!this.active || !this.isAlive) {
            return;
        }

        const direction = this._chaseDirection;
        direction.set(player.x - this.x, player.y - this.y);

        if (direction.lengthSq() > 0) {
            direction.normalize();
            this.setVelocity(direction.x * this.speed, direction.y * this.speed);

            if (direction.x !== 0) {
                const faceDirection = direction.x < 0 ? -1 : 1;
                this.setVisualTransform(this.scaleFactor, faceDirection);
            }
        }
        else {
            this.setVelocity(0, 0);
        }

        this.healthBar.setVisible(showHealthBar);
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

    canDamageAt(now, intervalMs) {
        if (now < this.lastDamageAt + intervalMs) {
            return false;
        }

        this.lastDamageAt = now;
        return true;
    }

    takeDamage(amount: number) {
        if (!this.active || !this.isAlive) {
            return false;
        }

        this.health = Math.max(0, this.health - amount);
        this.healthBar.setPercent(this.health / this.maxHealth);

        if (this.health <= 0) {
            this.deactivateToPool();
            return true;
        }

        return false;
    }

    deactivateToPool() {
        this.isAlive = false;
        this.setActive(false);
        this.setVisible(false);
        this.body.stop();
        this.body.enable = false;
        this.healthBar.setVisible(false);
    }

    updateHealthBar() {
        if (!this.active) {
            return;
        }

        const anchorX = this.body ? this.body.center.x : this.x;
        const anchorY = this.body ? this.body.top : (this.y - this.displayHeight / 2);

        this.healthBar.setWidth(Math.abs(this.displayWidth));
        this.healthBar.updatePosition(anchorX, anchorY);
    }

    destroy(fromScene?: boolean) {
        this.healthBar.destroy();
        super.destroy(fromScene);
    }

}
