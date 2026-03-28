import Phaser from 'phaser';

export class HealthBar {
    [key: string]: any;

    constructor(scene: Phaser.Scene, options: any = {}) {
        this.scene = scene;
        this.minWidth = options.minWidth ?? 24;
        this.width = Math.max(options.width ?? 40, this.minWidth);
        this.height = options.height ?? 5;
        this.offsetY = options.offsetY ?? 26;
        this.borderColor = options.borderColor ?? 0x101010;
        this.backgroundColor = options.backgroundColor ?? 0x2a2a2a;
        this.fillColor = options.fillColor ?? 0x50c878;
        this.depth = options.depth ?? 950;
        this.visible = options.visible ?? true;
        this.percent = 1;

        this.graphics = this.scene.add.graphics();
        this.graphics.setDepth(this.depth);
        this.graphics.setVisible(this.visible);
    }

    setWidth(width: number) {
        this.width = Math.max(Math.round(width), this.minWidth);
    }

    setPercent(value: number) {
        const nextPercent = Phaser.Math.Clamp(value, 0, 1);

        if (nextPercent === this.percent) {
            return;
        }

        this.percent = nextPercent;
    }

    setVisible(visible: boolean) {
        if (this.visible === visible) {
            return;
        }

        this.visible = visible;
        this.graphics.setVisible(visible);
    }

    updatePosition(x: number, y: number) {
        if (!this.visible) {
            return;
        }

        const drawX = Math.floor(x - this.width / 2);
        const drawY = Math.floor(y - this.offsetY);
        const innerX = drawX + 1;
        const innerY = drawY + 1;
        const innerWidth = this.width - 2;
        const innerHeight = this.height - 2;
        const fillWidth = Math.floor(innerWidth * this.percent);

        this.graphics.clear();
        this.graphics.fillStyle(this.borderColor, 1);
        this.graphics.fillRect(drawX, drawY, this.width, this.height);
        this.graphics.fillStyle(this.backgroundColor, 1);
        this.graphics.fillRect(innerX, innerY, innerWidth, innerHeight);

        if (fillWidth > 0) {
            this.graphics.fillStyle(this.fillColor, 1);
            this.graphics.fillRect(innerX, innerY, fillWidth, innerHeight);
        }
    }

    destroy() {
        this.graphics.destroy();
    }
}
