import Phaser from 'phaser';
import { GAMEPLAY } from '@/config/gameplay';
import { HealthBar } from '@/ui/HealthBar';
import { CollidableBody } from './CollidableBody';

export class Player extends Phaser.Physics.Arcade.Sprite {
    [key: string]: any;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture = 'player',
        options: any = {},
    ) {
        super(scene, x, y, texture);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.speed = options.speed ?? GAMEPLAY.player.speed;
        this.scaleFactor = 1;
        this.faceDirection = 1;
        this.facing = new Phaser.Math.Vector2(1, 0);
        this.abilities = Array.isArray(options.abilities)
            ? [...options.abilities]
            : [...(GAMEPLAY.player.abilities ?? [])];
        this.maxHealth = options.maxHealth ?? GAMEPLAY.player.maxHealth;
        this.health = this.maxHealth;
        this.isAlive = true;
        this.level = options.levelStart ?? GAMEPLAY.player.levelStart;
        this.xp = options.xpStart ?? GAMEPLAY.player.xpStart;
        this.xpToNextLevel =
            options.xpToNextLevelStart ?? GAMEPLAY.player.xpToNextLevelStart;
        this.xpGrowth = options.xpGrowth ?? GAMEPLAY.player.xpGrowth;
        this._bodyConfig = options.body ?? GAMEPLAY.player.body ?? null;
        this._collidableBody = new CollidableBody(this);

        this.healthBar = new HealthBar(scene, {
            ...GAMEPLAY.player.healthBar,
            visible: true,
        });
        this.setVisualTransform(
            options.scaleFactor ?? GAMEPLAY.player.scaleFactor,
        );
        this.healthBar.setWidth(Math.abs(this.displayWidth));
        this.healthBar.setPercent(1);
        this.healthBar.updatePosition(this.x, this.y);
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

    updateFromInput(direction: Phaser.Math.Vector2) {
        if (direction.lengthSq() > 0) {
            direction.normalize();
            this.updateFacing(direction);
        }

        this.applyMovement(direction);
        this.updateVisualFacing();
    }

    applyMovement(direction: Phaser.Math.Vector2) {
        this.setVelocity(direction.x * this.speed, direction.y * this.speed);
    }

    updateFacing(direction: Phaser.Math.Vector2) {
        this.facing.copy(direction);
    }

    updateVisualFacing() {
        if (this.facing.x !== 0) {
            const faceDirection = this.facing.x < 0 ? -1 : 1;
            this.setVisualTransform(this.scaleFactor, faceDirection);
        }
    }

    getFacingAngle() {
        return this.facing.angle();
    }

    getMuzzlePosition(out = new Phaser.Math.Vector2()) {
        if (this.body) {
            out.set(this.body.center.x, this.body.center.y);
        } else {
            out.set(this.x, this.y);
        }

        return out;
    }

    takeDamage(amount: number) {
        if (!this.isAlive) {
            return;
        }

        this.health = Math.max(0, this.health - amount);
        this.healthBar.setPercent(this.health / this.maxHealth);

        if (this.health <= 0) {
            this.isAlive = false;
        }
    }

    heal(amount: number) {
        if (!this.isAlive) {
            return;
        }

        this.health = Math.min(this.maxHealth, this.health + amount);
        this.healthBar.setPercent(this.health / this.maxHealth);
    }

    addXp(amount: number) {
        if (amount <= 0) {
            return;
        }

        this.xp += amount;

        while (this.xp >= this.xpToNextLevel) {
            this.xp -= this.xpToNextLevel;
            this.level += 1;
            this.xpToNextLevel = Math.max(
                1,
                Math.floor(this.xpToNextLevel * this.xpGrowth),
            );
        }
    }

    getXpProgress() {
        if (this.xpToNextLevel <= 0) {
            return 0;
        }

        return Phaser.Math.Clamp(this.xp / this.xpToNextLevel, 0, 1);
    }

    updateHealthBar() {
        const anchorX = this.body ? this.body.center.x : this.x;
        const anchorY = this.body
            ? this.body.top
            : this.y - this.displayHeight / 2;

        this.healthBar.setWidth(Math.abs(this.displayWidth));
        this.healthBar.updatePosition(anchorX, anchorY);
    }

    destroy(fromScene?: boolean) {
        this.healthBar.destroy();
        super.destroy(fromScene);
    }
}
