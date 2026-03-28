import Phaser from 'phaser';
import { GAMEPLAY } from '../config/gameplay';
import { Player } from '../entities/Player';
import { BulletManager } from '../projectiles/BulletManager';
import { EnemyManager } from '../enemies/EnemyManager';
import { EnemySpawner } from '../enemies/EnemySpawner';

export class BaseStage extends Phaser.Scene {
    [key: string]: any;

    constructor(key) {
        super(key);

        this.player = null;
        this.cursors = null;
        this.wasd = null;

        this.viewWidth = 1280;
        this.viewHeight = 720;
        this.blockSize = 1024;
        this.mapBlocks = [];
        this.blockOffsets = [-1, 0, 1];
        this.lastCenterBlockX = Number.NaN;
        this.lastCenterBlockY = Number.NaN;

        this.bulletManager = null;
        this.enemyManager = null;
        this.enemySpawner = null;
        this.collisionDebugGraphics = null;
        this.altKey = null;
        this.timerText = null;
        this.timerStartAt = 0;
        this.killsCount = 0;
        this.killsIcon = null;
        this.killsText = null;
        this.xpBar = null;
        this.levelText = null;
        this.xpBarBounds = {
            x: 20,
            y: 10,
            width: 1240,
            height: 24
        };
    }

    // -------------------------------------------------------------------------
    // Override hooks — subclasses implement these for stage-specific behaviour
    // -------------------------------------------------------------------------

    /** Load all textures/audio needed by this stage. Must be overridden. */
    preloadAssets() {}

    /** Texture key for the tiling background. */
    getBackgroundTextureKey() { return 'background'; }

    /** Texture key for the player sprite. */
    getPlayerTextureKey() { return 'player'; }

    /** Texture key for bullet sprites. */
    getBulletTextureKey() { return 'bullet'; }

    /** Texture key for the kills HUD icon. */
    getKillsIconKey() { return 'kills'; }

    /** Player balance config — override to tune per-stage values. */
    getPlayerConfig() { return GAMEPLAY.player; }

    /** Bullet balance config — override to tune per-stage values. */
    getBulletsConfig() { return GAMEPLAY.bullets; }

    /** Enemy balance config — override to tune per-stage values. */
    getEnemiesConfig() { return GAMEPLAY.enemies; }

    /** Spawner timeline config — override to tune per-stage values. */
    getSpawnerConfig() { return GAMEPLAY.spawner; }

    // -------------------------------------------------------------------------
    // Phaser lifecycle
    // -------------------------------------------------------------------------

    preload() {
        this.preloadAssets();
    }

    create() {
        this._createMap();
        this._createEntities();
        this._createOverlaps();
        this._createCamera();
        this._createInput();
        this._createHud();

        this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncHealthBars, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    }

    update(time) {
        const direction = new Phaser.Math.Vector2(0, 0);

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            direction.x -= 1;
        }
        else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            direction.x += 1;
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            direction.y -= 1;
        }
        else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            direction.y += 1;
        }

        this.player.updateFromInput(direction);

        const elapsedMs = time - this.timerStartAt;
        const showEnemyHealthBars = this.altKey.isDown;

        this.enemySpawner.update(elapsedMs, showEnemyHealthBars);
        this.enemyManager.update(this.player, showEnemyHealthBars);
        this.bulletManager.update(time, this.player);

        this.updateMapBlocks();
        this.updateXpHud();
        this.drawCollisionDebugBoxes();
        this.timerText.setText(this.formatTimer(elapsedMs));
    }

    // -------------------------------------------------------------------------
    // Private create helpers
    // -------------------------------------------------------------------------

    _createMap() {
        for (const yOffset of this.blockOffsets) {
            for (const xOffset of this.blockOffsets) {
                const block = this.add
                    .tileSprite(0, 0, this.blockSize, this.blockSize, this.getBackgroundTextureKey())
                    .setOrigin(0) as Phaser.GameObjects.TileSprite & { xOffset: number; yOffset: number };

                block.xOffset = xOffset;
                block.yOffset = yOffset;

                this.mapBlocks.push(block);
            }
        }
    }

    _createEntities() {
        const playerConfig = this.getPlayerConfig();

        this.player = new Player(this, 0, 0, this.getPlayerTextureKey(), {
            speed: playerConfig.speed,
            maxHealth: playerConfig.maxHealth,
            scaleFactor: playerConfig.scaleFactor
        });

        this.bulletManager = new BulletManager(this, this.getBulletsConfig(), this.getBulletTextureKey());
        this.enemyManager = new EnemyManager(this, this.getEnemiesConfig());
        this.enemySpawner = new EnemySpawner(this, this.enemyManager, this.getSpawnerConfig());
    }

    _createOverlaps() {
        this.physics.add.overlap(
            this.bulletManager.group,
            this.enemyManager.getGroup(),
            this.handleBulletEnemyOverlap,
            null,
            this
        );

        this.physics.add.overlap(
            this.player,
            this.enemyManager.getGroup(),
            this.handlePlayerEnemyOverlap,
            null,
            this
        );
    }

    _createCamera() {
        this.cameras.main.startFollow(this.player, true, 1, 1);
        this.updateMapBlocks(true);
    }

    _createInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        this.altKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ALT);
    }

    _createHud() {
        if (GAMEPLAY.debug?.showCollisionBoxes) {
            this.collisionDebugGraphics = this.add.graphics();
            this.collisionDebugGraphics.setDepth(900);
        }

        this.timerStartAt = this.time.now;
        this.timerText = this.add.text(this.viewWidth / 2, 40, '00:00', {
            fontFamily: 'Courier New, monospace',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#121212',
            strokeThickness: 4
        });
        this.timerText.setOrigin(0.5, 0);
        this.timerText.setScrollFactor(0);
        this.timerText.setDepth(1000);
        this.timerText.setResolution(1);

        this.killsIcon = this.add.image(this.viewWidth - 16, 40, this.getKillsIconKey());
        this.killsIcon.setOrigin(1, 0);
        this.killsIcon.setScrollFactor(0);
        this.killsIcon.setDepth(1000);
        this.killsIcon.setScale(0.18);

        this.killsText = this.add.text(this.viewWidth - 48, 40, '0', {
            fontFamily: 'Courier New, monospace',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#121212',
            strokeThickness: 4
        });
        this.killsText.setOrigin(1, 0);
        this.killsText.setScrollFactor(0);
        this.killsText.setDepth(1000);
        this.killsText.setResolution(1);

        this.xpBar = this.add.graphics();
        this.xpBar.setScrollFactor(0);
        this.xpBar.setDepth(1100);

        const xpCenterX = this.xpBarBounds.x + this.xpBarBounds.width / 2;
        const xpCenterY = this.xpBarBounds.y + this.xpBarBounds.height / 2;

        this.levelText = this.add.text(xpCenterX, xpCenterY, '', {
            fontFamily: 'Courier New, monospace',
            fontSize: '22px',
            color: '#ffffff',
            stroke: '#121212',
            strokeThickness: 4
        });
        this.levelText.setOrigin(0.5, 0.5);
        this.levelText.setScrollFactor(0);
        this.levelText.setDepth(1101);
        this.levelText.setResolution(1);

        this.updateXpHud();
    }

    // -------------------------------------------------------------------------
    // Overlap handlers
    // -------------------------------------------------------------------------

    handleBulletEnemyOverlap(bullet, enemy) {
        const wasKilled = this.bulletManager.handleBulletEnemyOverlap(bullet, enemy);

        if (wasKilled) {
            this.killsCount += 1;
            this.killsText.setText(String(this.killsCount));

            const enemiesConfig = this.getEnemiesConfig();
            const typeXp = enemiesConfig.enemyTypes?.[enemy.enemyType]?.xpYield;
            const instanceXp = enemy.xpYield;
            const resolvedXp = Number.isFinite(typeXp) ? typeXp : instanceXp;
            const xpGain = Number.isFinite(resolvedXp) ? Math.max(1, resolvedXp) : 1;

            this.player.addXp(xpGain);
            this.updateXpHud();
        }
    }

    handlePlayerEnemyOverlap(player, enemy) {
        if (!enemy.active || !enemy.isAlive || !player.isAlive) {
            return;
        }

        const enemiesConfig = this.getEnemiesConfig();

        if (enemy.canDamageAt(this.time.now, enemiesConfig.damageIntervalMs)) {
            player.takeDamage(enemy.damage);
        }
    }

    // -------------------------------------------------------------------------
    // Map
    // -------------------------------------------------------------------------

    updateMapBlocks(force = false) {
        const centerBlockX = Math.floor(this.player.x / this.blockSize);
        const centerBlockY = Math.floor(this.player.y / this.blockSize);

        if (!force && centerBlockX === this.lastCenterBlockX && centerBlockY === this.lastCenterBlockY) {
            return;
        }

        this.lastCenterBlockX = centerBlockX;
        this.lastCenterBlockY = centerBlockY;

        for (const block of this.mapBlocks) {
            const blockWorldX = (centerBlockX + block.xOffset) * this.blockSize;
            const blockWorldY = (centerBlockY + block.yOffset) * this.blockSize;

            block.setPosition(blockWorldX, blockWorldY);

            // Keep texture seams consistent while chunks recycle.
            block.tilePositionX = blockWorldX;
            block.tilePositionY = blockWorldY;
        }
    }

    // -------------------------------------------------------------------------
    // HUD
    // -------------------------------------------------------------------------

    formatTimer(elapsedMs) {
        const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }

    updateXpHud() {
        const currentXp = Number.isFinite(this.player.xp) ? this.player.xp : 0;
        const nextXp = Math.max(1, Number.isFinite(this.player.xpToNextLevel) ? this.player.xpToNextLevel : 1);
        const progress = Phaser.Math.Clamp(currentXp / nextXp, 0, 1);
        const bar = this.xpBarBounds;
        const innerWidth = Math.max(1, bar.width - 2);
        let fillWidth = Math.floor(innerWidth * progress);

        if (currentXp > 0 && fillWidth < 1) {
            fillWidth = 1;
        }

        this.xpBar.clear();
        this.xpBar.fillStyle(0x0d111a, 1);
        this.xpBar.fillRect(bar.x, bar.y, bar.width, bar.height);
        this.xpBar.fillStyle(0x11233d, 1);
        this.xpBar.fillRect(bar.x + 1, bar.y + 1, bar.width - 2, bar.height - 2);
        this.xpBar.fillStyle(0x4da3ff, 1);
        this.xpBar.fillRect(bar.x + 1, bar.y + 1, fillWidth, bar.height - 2);

        const centerX = bar.x + bar.width / 2;
        const centerY = bar.y + bar.height / 2;

        this.levelText.setPosition(centerX, centerY);
        this.levelText.setText('LV ' + this.player.level);
    }

    // -------------------------------------------------------------------------
    // Debug
    // -------------------------------------------------------------------------

    drawCollisionDebugBoxes() {
        if (!GAMEPLAY.debug?.showCollisionBoxes) {
            if (this.collisionDebugGraphics) {
                this.collisionDebugGraphics.clear();
                this.collisionDebugGraphics.setVisible(false);
            }

            return;
        }

        if (!this.collisionDebugGraphics) {
            this.collisionDebugGraphics = this.add.graphics();
            this.collisionDebugGraphics.setDepth(900);
        }

        this.collisionDebugGraphics.setVisible(true);
        this.collisionDebugGraphics.clear();

        this.drawDebugBody(this.player?.body, 0x2ecc71);

        const enemies = this.enemyManager?.getGroup()?.getChildren() ?? [];

        for (const enemy of enemies) {
            if (!enemy.active) {
                continue;
            }

            this.drawDebugBody(enemy.body, 0xff5c5c);
        }

        const bullets = this.bulletManager?.group?.getChildren() ?? [];

        for (const bullet of bullets) {
            if (!bullet.active) {
                continue;
            }

            this.drawDebugBody(bullet.body, 0xf7dc6f);
        }
    }

    drawDebugBody(body, color) {
        if (!body || !this.collisionDebugGraphics) {
            return;
        }

        const bodyType = body.physicsType ?? body.type;
        const isDynamic = bodyType === Phaser.Physics.Arcade.DYNAMIC_BODY;
        const isStatic = bodyType === Phaser.Physics.Arcade.STATIC_BODY;

        if (!isDynamic && !isStatic) {
            return;
        }

        this.collisionDebugGraphics.lineStyle(2, color, 1);

        if (body.isCircle) {
            this.collisionDebugGraphics.strokeCircle(body.center.x, body.center.y, body.radius);
        } else {
            this.collisionDebugGraphics.strokeRect(body.x, body.y, body.width, body.height);
        }
    }

    // -------------------------------------------------------------------------
    // Health bars (post-update sync)
    // -------------------------------------------------------------------------

    syncHealthBars() {
        if (this.player) {
            this.player.updateHealthBar();
        }

        if (!this.enemyManager) {
            return;
        }

        for (const enemy of this.enemyManager.getGroup().getChildren()) {
            if (!enemy.active) {
                continue;
            }

            enemy.updateHealthBar();
        }
    }

    // -------------------------------------------------------------------------
    // Shutdown
    // -------------------------------------------------------------------------

    onShutdown() {
        this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncHealthBars, this);

        if (this.collisionDebugGraphics) {
            this.collisionDebugGraphics.destroy();
            this.collisionDebugGraphics = null;
        }
    }

}
