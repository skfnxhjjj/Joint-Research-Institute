import { SceneNode } from '/scene/SceneNode.js';

export class Joint extends SceneNode {
    constructor({
        name,
        axis = [0, 1, 0], // 회전축(옵션)
        min = -Math.PI,
        max = Math.PI,
        offset = [0, 0, 0], // 관절의 기준 위치
        mesh = null
    }) {
        super({ name, mesh });
        this.axis = axis;
        this.min = min;
        this.max = max;

        // offset을 base transform에 적용
        this.transforms.base = m4.translation(...offset);
        // 각 transform(gait, ik, user)는 identity로 초기화
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
        // user * ik * gait * base 순서로 누적 곱
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