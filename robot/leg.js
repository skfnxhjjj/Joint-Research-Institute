import {SceneNode} from "../scene/SceneNode.js";
import config from "./robotConfig.js";
import {loadMesh} from "../utils/meshUtils.js";

// Leg class
export class Leg {
    static async create(gl, index, attach) {
        const leg = new Leg();
        await leg.init(gl, index, attach);
        return leg;
    }

    async init(gl, index, attach) {
        this.index = index;
        this.attach = attach || [0, 0, 0];
        const {upper, lower, foot} = config.segmentConfig;

        const upperMesh = await loadMesh(gl, upper.mesh);
        const lowerMesh = await loadMesh(gl, lower.mesh);
        const footMesh = await loadMesh(gl, foot.mesh);

        const upperNode = new SceneNode({
            name: `leg${index}_upper`,
            mesh: upperMesh,
            pivot: upper.pivot,
            localMatrix: m4.identity()
        });
        upperNode.transforms.base = m4.translation(...this.attach);
        upperNode.jointLimits = upper.jointLimits;

        const lowerNode = new SceneNode({
            name: `leg${index}_lower`,
            mesh: lowerMesh,
            pivot: lower.pivot,
            localMatrix: m4.identity()
        });
        lowerNode.transforms.base = m4.multiply(
            m4.translation(0, upper.mesh.size[1], 0),
            m4.translation(...lower.pivot)
        );
        lowerNode.jointLimits = lower.jointLimits;

        const footNode = new SceneNode({
            name: `leg${index}_foot`,
            mesh: footMesh,
            pivot: foot.pivot,
            localMatrix: m4.identity()
        });
        footNode.transforms.base = m4.multiply(
            m4.translation(0, lower.mesh.size[1], 0),
            m4.translation(...foot.pivot)
        );
        footNode.jointLimits = foot.jointLimits;

        upperNode.addChild(lowerNode);
        lowerNode.addChild(footNode);

        this.root = upperNode;

        // Compute initial foot world position from upperNode's worldMatrix
        upperNode.updateWorldMatrix();
        this.attachWorld = m4.transformPoint(upperNode.worldMatrix, [0, 0, 0]);
        this.footPosition = [...this.attachWorld];
        this.footTarget = [...this.attachWorld];
        this.phase = "support";
    }

    update(time) {
        if (!this.footTarget || !this.footPosition) return;

        const dx = this.footTarget[0] - this.footPosition[0];
        const dy = this.footTarget[1] - this.footPosition[1];
        const dz = this.footTarget[2] - this.footPosition[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        const threshold = 0.01;

        if (dist > threshold) {
            // 스윙 단계일 때는 더 빠르게, 지지 단계일 때는 조금 더 천천히
            const alpha = this.phase === "swing" ? 0.15 : 0.08;
            
            const lerp = (a, b, t) => a + (b - a) * t;
            
            this.footPosition = [
                lerp(this.footPosition[0], this.footTarget[0], alpha),
                lerp(this.footPosition[1], this.footTarget[1], alpha),
                lerp(this.footPosition[2], this.footTarget[2], alpha)
            ];
            
            this.isMoving = true;
        } else {
            // 목표에 도달하면 정확히 목표 위치로 설정
            this.footPosition = [...this.footTarget];
            
            // 스윙 단계가 끝나면 지지 단계로 전환
            if (this.phase === "swing") {
                this.isMoving = false;
            }
        }
    }

    getFootWorldPosition() {
        return this.footPosition;
    }
}