import { SceneNode } from '/scene/SceneNode.js';

export class Joint extends SceneNode {
    constructor({
        name,
        axis = [0, 1, 0],
        min = -Math.PI,
        max = Math.PI,
        offset = [0, 0, 0],
        mesh = null
    }) {
        super({ name, mesh });
        this.axis = axis;
        this.min = min;
        this.max = max;

        this.transforms.base = m4.translation(...offset);
        this.transforms.gait = m4.identity();
        this.transforms.ik = m4.identity();
        this.transforms.user = m4.identity();
    }

    _axisRotation(angle) {
        if (this.axis[0]) return m4.xRotation(angle);
        if (this.axis[1]) return m4.yRotation(angle);
        if (this.axis[2]) return m4.zRotation(angle);
        return m4.identity();
    }

    updateLocalMatrix() {
        this.localMatrix = m4.multiply(
            this.transforms.base,
            m4.multiply(
                this.transforms.gait,
                m4.multiply(
                    this.transforms.ik,
                    this.transforms.user
                )
            )
        );
    }
}