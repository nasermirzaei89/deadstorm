import Phaser from 'phaser';
import { Ability } from '@/abilities/Ability';
import { Enemy } from '@/entities/Enemy';
import { Player } from '@/entities/Player';
import { GAMEPLAY } from '@/config/gameplay';

export class Aura extends Ability {
    [key: string]: any;

    constructor(scene: Phaser.Scene, config: any = {}) {
        const defaults = GAMEPLAY.abilities.aura ?? {};
        const mergedConfig = {
            ...defaults,
            ...config,
        };

        super(scene, 'Aura', mergedConfig);

        this.radius = Math.max(8, Number(this.config.radius ?? 110));
        this.damage = Math.max(0, Number(this.config.damage ?? 8));
        this.tickMs = Math.max(1, Number(this.config.tickMs ?? 350));
        this.color = Number.isFinite(this.config.color)
            ? Number(this.config.color)
            : 0x5de2ff;
        this.alpha = Phaser.Math.Clamp(Number(this.config.alpha ?? 0.2), 0, 1);

        this.damageEnabled = true;
        this.nextDamageAtByEnemyId = new Map<number, number>();

        this.group = this.scene.physics.add.group({
            maxSize: 1,
            runChildUpdate: false,
        });

        this.zone = this.scene.add.zone(0, 0, this.radius * 2, this.radius * 2);
        this.scene.physics.add.existing(this.zone);

        const body = this.zone.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setCircle(this.radius, 0, 0);
        body.enable = true;

        this.group.add(this.zone);

        this.visual = this.scene.add
            .circle(0, 0, this.radius, this.color, this.alpha)
            .setDepth(0)
            .setVisible(true);
    }

    update(_time: number, player: Player) {
        if (!player?.active) {
            return;
        }

        this.zone.setPosition(player.x, player.y);
        this.visual.setPosition(player.x, player.y);
        this.visual.setDepth((player.depth ?? 0) - 1);

        const body = this.zone.body as Phaser.Physics.Arcade.Body;

        if (body?.reset) {
            body.reset(player.x, player.y);
        } else if (body?.updateFromGameObject) {
            body.updateFromGameObject();
        }

        if (!this.damageEnabled) {
            this.damageEnabled = true;
            if (body) {
                body.enable = true;
            }
            this.visual.setVisible(true);
        }
    }

    handleEnemyOverlap(_zone: any, enemy: Enemy) {
        if (!this.damageEnabled || !enemy.active || !enemy.isAlive) {
            return false;
        }

        const now = this.scene.time.now;
        const enemyId = Number(enemy.enemyId);
        const nextDamageAt = this.nextDamageAtByEnemyId.get(enemyId) ?? 0;

        if (now < nextDamageAt) {
            return false;
        }

        this.nextDamageAtByEnemyId.set(enemyId, now + this.tickMs);
        const wasKilled = enemy.takeDamage(this.damage);

        if (!enemy.active || !enemy.isAlive) {
            this.nextDamageAtByEnemyId.delete(enemyId);
        }

        return wasKilled;
    }

    onGameOverUpdate(_time: number, _player: Player) {
        this.damageEnabled = false;
        this.visual.setVisible(false);

        const body = this.zone?.body as Phaser.Physics.Arcade.Body | undefined;

        if (body) {
            body.enable = false;
        }
    }

    destroy() {
        this.nextDamageAtByEnemyId.clear();

        if (this.visual) {
            this.visual.destroy();
            this.visual = null;
        }

        super.destroy();
    }
}
