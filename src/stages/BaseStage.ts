import Phaser from 'phaser';
import { CHARACTERS } from '@/config/characters';
import { GAMEPLAY } from '@/config/gameplay';
import { Player } from '@/entities/Player';
import { EnemyManager } from '@/enemies/EnemyManager';
import { EnemySpawner } from '@/enemies/EnemySpawner';
import { Enemy } from '@/entities/Enemy';
import { Ability } from '@/abilities/Ability';
import { Gun } from '@/abilities/Gun';
import { Boomerang } from '@/abilities/Boomerang';

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

        this.abilities = [];
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
        this.abilityHudItems = [];
        this.selectedCharacter = null;
        this.xpBarBounds = {
            x: 20,
            y: 10,
            width: 1240,
            height: 24,
        };
        this.gameOverShown = false;
        this.inputDirection = new Phaser.Math.Vector2(0, 0);
        this.gameOverModal = null;
        this.gameOverRestartButton = null;
        this.gameOverRestartSelected = true;
        this.gameOverRestarting = false;
    }

    // -------------------------------------------------------------------------
    // Override hooks — subclasses implement these for stage-specific behaviour
    // -------------------------------------------------------------------------

    /** Load all textures/audio needed by this stage. Must be overridden. */
    preloadAssets() {}

    /** Texture key for the tiling background. */
    getBackgroundTextureKey() {
        return 'background';
    }

    /** Texture key for the player sprite. */
    getPlayerTextureKey() {
        return this.selectedCharacter?.textureKey ?? 'player';
    }

    /** Texture key for bullet sprites. */
    getBulletTextureKey() {
        return 'bullet';
    }

    /** Texture key for the kills HUD icon. */
    getKillsIconKey() {
        return 'kills';
    }

    /** Player balance config — override to tune per-stage values. */
    getPlayerConfig() {
        if (!this.selectedCharacter) {
            return GAMEPLAY.player;
        }

        return {
            ...GAMEPLAY.player,
            speed: this.selectedCharacter.speed,
            maxHealth: this.selectedCharacter.maxHealth,
            abilities: [...this.selectedCharacter.abilities],
        };
    }

    /** Ability balance config — override to tune per-stage values. */
    getAbilitiesConfig() {
        return GAMEPLAY.abilities;
    }

    /** Enemy balance config — override to tune per-stage values. */
    getEnemiesConfig() {
        return GAMEPLAY.enemies;
    }

    /** Texture key for boomerang projectiles. */
    getBoomerangTextureKey() {
        return 'boomerang';
    }

    /** Spawner timeline config — override to tune per-stage values. */
    getSpawnerConfig() {
        return GAMEPLAY.spawner;
    }

    // -------------------------------------------------------------------------
    // Phaser lifecycle
    // -------------------------------------------------------------------------

    preload() {
        this.preloadAssets();
    }

    init(data: any) {
        const selectedCharacterId = data?.selectedCharacterId;
        const fallback = CHARACTERS[0] ?? null;

        this.selectedCharacter =
            CHARACTERS.find((item) => item.id === selectedCharacterId) ??
            fallback;
    }

    create() {
        this.gameOverShown = false;
        this.gameOverRestarting = false;
        this.gameOverRestartSelected = true;

        this._createMap();
        this._createEntities();
        this._createOverlaps();
        this._createCamera();
        this._createInput();
        this._createHud();

        this.events.on(
            Phaser.Scenes.Events.POST_UPDATE,
            this.syncHealthBars,
            this,
        );
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    }

    update(time) {
        if (!this.player?.isAlive) {
            this.handleGameOver();

            for (const ability of this.abilities) {
                ability.onGameOverUpdate(time, this.player);
            }

            return;
        }

        const direction = this.inputDirection;
        direction.set(0, 0);

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            direction.x -= 1;
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            direction.x += 1;
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            direction.y -= 1;
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            direction.y += 1;
        }

        this.player.updateFromInput(direction);

        const elapsedMs = time - this.timerStartAt;
        const showEnemyHealthBars = this.altKey.isDown;

        this.enemySpawner.update(elapsedMs, showEnemyHealthBars);
        this.enemyManager.update(this.player, showEnemyHealthBars);
        for (const ability of this.abilities) {
            ability.update(time, this.player);
        }

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
                    .tileSprite(
                        0,
                        0,
                        this.blockSize,
                        this.blockSize,
                        this.getBackgroundTextureKey(),
                    )
                    .setOrigin(0) as Phaser.GameObjects.TileSprite & {
                    xOffset: number;
                    yOffset: number;
                };

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
            scaleFactor: playerConfig.scaleFactor,
            abilities: playerConfig.abilities,
        });

        this.enemyManager = new EnemyManager(this, this.getEnemiesConfig());
        this.enemySpawner = new EnemySpawner(
            this,
            this.enemyManager,
            this.getSpawnerConfig(),
        );

        const abilitiesConfig = this.getAbilitiesConfig();
        const playerAbilities = this.player.abilities ?? [];

        this.abilities = [];

        if (playerAbilities.includes('Gun')) {
            this.abilities.push(
                new Gun(
                    this,
                    abilitiesConfig.gun ?? {},
                    this.getBulletTextureKey(),
                ),
            );
        }

        if (playerAbilities.includes('Boomerang')) {
            this.abilities.push(
                new Boomerang(
                    this,
                    this.enemyManager,
                    abilitiesConfig.boomerang ?? {},
                    this.getBoomerangTextureKey(),
                ),
            );
        }
    }

    _createOverlaps() {
        for (const ability of this.abilities) {
            const group = ability.getGroup();

            if (!group) {
                continue;
            }

            this.physics.add.overlap(
                group,
                this.enemyManager.getGroup(),
                (projectile, enemy) =>
                    this.handleAbilityEnemyOverlap(
                        ability,
                        projectile,
                        enemy as Enemy,
                    ),
                null,
                this,
            );
        }

        this.physics.add.overlap(
            this.player,
            this.enemyManager.getGroup(),
            this.handlePlayerEnemyOverlap,
            null,
            this,
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
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });
        this.altKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ALT,
        );

        this.input.keyboard.on(
            'keydown-ENTER',
            this.handleGameOverKeyboardActivate,
            this,
        );
        this.input.keyboard.on(
            'keydown-SPACE',
            this.handleGameOverKeyboardActivate,
            this,
        );
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
            strokeThickness: 4,
        });
        this.timerText.setOrigin(0.5, 0);
        this.timerText.setScrollFactor(0);
        this.timerText.setDepth(1000);
        this.timerText.setResolution(1);

        this.killsIcon = this.add.image(
            this.viewWidth - 16,
            40,
            this.getKillsIconKey(),
        );
        this.killsIcon.setOrigin(1, 0);
        this.killsIcon.setScrollFactor(0);
        this.killsIcon.setDepth(1000);
        this.killsIcon.setScale(0.18);

        this.killsText = this.add.text(this.viewWidth - 48, 40, '0', {
            fontFamily: 'Courier New, monospace',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#121212',
            strokeThickness: 4,
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
            strokeThickness: 4,
        });
        this.levelText.setOrigin(0.5, 0.5);
        this.levelText.setScrollFactor(0);
        this.levelText.setDepth(1101);
        this.levelText.setResolution(1);

        this.createAbilitiesHud();
        this.updateXpHud();
    }

    // -------------------------------------------------------------------------
    // Overlap handlers
    // -------------------------------------------------------------------------

    handleAbilityEnemyOverlap(ability: Ability, projectile: any, enemy: Enemy) {
        if (this.gameOverShown) {
            return false;
        }

        const wasKilled = ability.handleEnemyOverlap(projectile, enemy);

        if (wasKilled) {
            this.killsCount += 1;
            this.killsText.setText(String(this.killsCount));

            const enemiesConfig = this.getEnemiesConfig();
            const typeXp = enemiesConfig.enemyTypes?.[enemy.enemyType]?.xpYield;
            const instanceXp = enemy.xpYield;
            const resolvedXp = Number.isFinite(typeXp) ? typeXp : instanceXp;
            const xpGain = Number.isFinite(resolvedXp)
                ? Math.max(1, resolvedXp)
                : 1;

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

    handleGameOver() {
        if (this.gameOverShown) {
            return;
        }

        this.gameOverShown = true;

        if (this.player?.body) {
            this.player.setVelocity(0, 0);
        }

        const enemies = this.enemyManager?.getGroup()?.getChildren() ?? [];

        for (const enemy of enemies) {
            if (!enemy.active || !enemy.body) {
                continue;
            }

            enemy.setVelocity(0, 0);
        }

        this.createGameOverModal();
    }

    handleGameOverKeyboardActivate() {
        if (!this.gameOverShown || !this.gameOverRestartSelected) {
            return;
        }

        this.restartFromGameOver();
    }

    createGameOverModal() {
        if (this.gameOverModal) {
            return;
        }

        const centerX = this.viewWidth / 2;
        const centerY = this.viewHeight / 2;

        const backdrop = this.add
            .rectangle(
                centerX,
                centerY,
                this.viewWidth,
                this.viewHeight,
                0x000000,
                0.6,
            )
            .setScrollFactor(0)
            .setDepth(3000)
            .setInteractive();

        const panel = this.add
            .rectangle(centerX, centerY, 420, 230, 0x111827, 0.95)
            .setScrollFactor(0)
            .setDepth(3001)
            .setStrokeStyle(2, 0x4b5563, 1);

        const title = this.add
            .text(centerX, centerY - 55, 'Game Over', {
                fontFamily: 'Courier New, monospace',
                fontSize: '42px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(3002);

        this.gameOverRestartButton = this.add
            .rectangle(centerX, centerY + 20, 180, 52, 0x2563eb, 1)
            .setScrollFactor(0)
            .setDepth(3002)
            .setStrokeStyle(2, 0x93c5fd, 1)
            .setInteractive({ useHandCursor: true });

        const restartLabel = this.add
            .text(centerX, centerY + 20, 'Quit', {
                fontFamily: 'Courier New, monospace',
                fontSize: '28px',
                color: '#ffffff',
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(3003);

        const hint = this.add
            .text(centerX, centerY + 68, 'Press Enter/Space or Click Quit', {
                fontFamily: 'Courier New, monospace',
                fontSize: '14px',
                color: '#cbd5e1',
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(3002);

        this.gameOverRestartSelected = true;
        this.gameOverRestartButton.on(
            'pointerdown',
            this.restartFromGameOver,
            this,
        );

        this.gameOverModal = [
            backdrop,
            panel,
            title,
            this.gameOverRestartButton,
            restartLabel,
            hint,
        ];
    }

    clearGameOverModal() {
        if (!this.gameOverModal) {
            return;
        }

        for (const obj of this.gameOverModal) {
            obj.destroy();
        }

        this.gameOverModal = null;
        this.gameOverRestartButton = null;
    }

    restartFromGameOver() {
        if (this.gameOverRestarting) {
            return;
        }

        this.gameOverRestarting = true;
        this.clearGameOverModal();
        this.scene.start('CharacterSelect');
    }

    // -------------------------------------------------------------------------
    // Map
    // -------------------------------------------------------------------------

    updateMapBlocks(force = false) {
        const centerBlockX = Math.floor(this.player.x / this.blockSize);
        const centerBlockY = Math.floor(this.player.y / this.blockSize);

        if (
            !force &&
            centerBlockX === this.lastCenterBlockX &&
            centerBlockY === this.lastCenterBlockY
        ) {
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

        return (
            String(minutes).padStart(2, '0') +
            ':' +
            String(seconds).padStart(2, '0')
        );
    }

    getAbilityHudTextureKey(abilityName: string) {
        if (abilityName === 'Gun') {
            return this.getBulletTextureKey();
        }

        if (abilityName === 'Boomerang') {
            return this.getBoomerangTextureKey();
        }

        return null;
    }

    createAbilitiesHud() {
        for (const item of this.abilityHudItems) {
            item.destroy();
        }

        this.abilityHudItems = [];

        const abilityNames = this.player?.abilities ?? [];

        if (!abilityNames.length) {
            return;
        }

        const boxSize = 42;
        const boxGap = 10;
        const startX = this.xpBarBounds.x;
        const startY = this.xpBarBounds.y + this.xpBarBounds.height + 12;
        const hudDepth = 1100;
        const maxIconSize = boxSize - 12;

        for (let i = 0; i < abilityNames.length; i += 1) {
            const abilityName = abilityNames[i];
            const textureKey = this.getAbilityHudTextureKey(abilityName);
            const centerX = startX + boxSize / 2 + i * (boxSize + boxGap);
            const centerY = startY + boxSize / 2;

            const box = this.add
                .rectangle(centerX, centerY, boxSize, boxSize, 0x111827, 0.9)
                .setScrollFactor(0)
                .setDepth(hudDepth)
                .setStrokeStyle(2, 0x4da3ff, 0.95);

            this.abilityHudItems.push(box);

            if (!textureKey) {
                continue;
            }

            const icon = this.add
                .image(centerX, centerY, textureKey)
                .setScrollFactor(0)
                .setDepth(hudDepth + 1);

            const sourceImage = icon.texture?.getSourceImage?.();
            const textureWidth = sourceImage?.width ?? icon.width ?? 1;
            const textureHeight = sourceImage?.height ?? icon.height ?? 1;
            const scale = Math.min(
                maxIconSize / textureWidth,
                maxIconSize / textureHeight,
            );

            icon.setScale(scale);
            this.abilityHudItems.push(icon);
        }
    }

    updateXpHud() {
        const currentXp = Number.isFinite(this.player.xp) ? this.player.xp : 0;
        const nextXp = Math.max(
            1,
            Number.isFinite(this.player.xpToNextLevel)
                ? this.player.xpToNextLevel
                : 1,
        );
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
        this.xpBar.fillRect(
            bar.x + 1,
            bar.y + 1,
            bar.width - 2,
            bar.height - 2,
        );
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

        for (const ability of this.abilities) {
            const projectiles = ability?.getGroup?.()?.getChildren?.() ?? [];

            for (const projectile of projectiles) {
                if (!projectile.active) {
                    continue;
                }

                this.drawDebugBody(projectile.body, 0xf7dc6f);
            }
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
            this.collisionDebugGraphics.strokeCircle(
                body.center.x,
                body.center.y,
                body.radius,
            );
        } else {
            this.collisionDebugGraphics.strokeRect(
                body.x,
                body.y,
                body.width,
                body.height,
            );
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
        for (const ability of this.abilities) {
            ability.destroy?.();
        }

        this.abilities = [];

        this.input.keyboard.off(
            'keydown-ENTER',
            this.handleGameOverKeyboardActivate,
            this,
        );
        this.input.keyboard.off(
            'keydown-SPACE',
            this.handleGameOverKeyboardActivate,
            this,
        );
        this.clearGameOverModal();

        this.events.off(
            Phaser.Scenes.Events.POST_UPDATE,
            this.syncHealthBars,
            this,
        );

        for (const item of this.abilityHudItems) {
            item.destroy();
        }

        this.abilityHudItems = [];

        if (this.collisionDebugGraphics) {
            this.collisionDebugGraphics.destroy();
            this.collisionDebugGraphics = null;
        }
    }
}
