export class CollidableBody {
    [key: string]: any;

    constructor(owner) {
        this.owner = owner;
    }

    apply(bodyConfig) {
        const body = this.owner?.body;

        if (!body) {
            return;
        }

        const baseWidth = this.owner.width;
        const baseHeight = this.owner.height;

        switch (bodyConfig?.shape) {
            case 'circle': {
                const defaultRadius = Math.min(baseWidth, baseHeight) / 2;
                const radius = bodyConfig.radius ?? (bodyConfig.radiusFactor != null ? defaultRadius * bodyConfig.radiusFactor : defaultRadius);
                body.setCircle(radius, (baseWidth - radius * 2) / 2, (baseHeight - radius * 2) / 2);
                break;
            }
            case 'rectangle':
            default:
                const w = bodyConfig?.width ?? (bodyConfig?.widthFactor != null ? baseWidth * bodyConfig.widthFactor : baseWidth);
                const h = bodyConfig?.height ?? (bodyConfig?.heightFactor != null ? baseHeight * bodyConfig.heightFactor : baseHeight);

                body.setSize(w, h, true);
        }
    }
}
