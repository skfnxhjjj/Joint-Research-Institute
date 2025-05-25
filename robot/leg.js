import {SceneNode} from "../scene/SceneNode.js";
import {Joint} from "./Joint.js";
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
        this.name = `leg${index}`;
        this.attach = attach || [0, 0, 0];
        const {upper, lower, foot} = config.segmentConfig;
        const {hip, shoulder, knee} = config.jointConfig;

        // 세그먼트 메시 로드
        const upperMesh = await loadMesh(gl, upper.mesh);
        const lowerMesh = await loadMesh(gl, lower.mesh);
        const footMesh = await loadMesh(gl, foot.mesh);

        // 조인트 생성
        this.hipJoint = new Joint({
            name: `leg${index}_hip`,
            ...hip,
            position: attach // body에서 다리가 붙는 위치
        });

        this.kneeJoint = new Joint({
            name: `leg${index}_Knee`,
            ...shoulder
        });

        this.ankleJoint = new Joint({
            name: `leg${index}_ankle`,
            ...knee
        });

        // 세그먼트 노드 생성
        const upperNode = new SceneNode({
            name: `leg${index}_upper`,
            mesh: upperMesh,
            pivot: upper.pivot,
            localMatrix: m4.identity()
        });

        const lowerNode = new SceneNode({
            name: `leg${index}_lower`,
            mesh: lowerMesh,
            pivot: lower.pivot,
            localMatrix: m4.identity()
        });
        lowerNode.transforms.base = m4.translation(0, upper.mesh.size[1], 0);

        const footNode = new SceneNode({
            name: `leg${index}_foot`,
            mesh: footMesh,
            pivot: foot.pivot,
            localMatrix: m4.identity()
        });
        footNode.transforms.base = m4.translation(0, lower.mesh.size[1], 0);

        // 조인트 체인 구성: hip -> upper -> knee -> lower -> foot
        this.hipJoint.node.addChild(upperNode);
        upperNode.addChild(this.kneeJoint.node);
        this.kneeJoint.node.addChild(lowerNode);
        lowerNode.addChild(this.ankleJoint.node);
        this.ankleJoint.node.addChild(footNode);

        // 루트는 hip 조인트
        this.root = this.hipJoint.node;
        
        // 세그먼트 노드들 저장
        this.upperNode = upperNode;
        this.lowerNode = lowerNode;
        this.footNode = footNode;

        // 초기 변환 업데이트
        this.updateJoints();

        // 초기 foot 위치 계산
        this.root.updateWorldMatrix();
        this.attachWorld = m4.transformPoint(this.root.worldMatrix, [0, 0, 0]);
        this.footPosition = [...this.attachWorld];
        this.footTarget = [...this.attachWorld];
        this.phase = "support";
    }

    /**
     * 모든 조인트의 변환 업데이트
     */
    updateJoints() {
        this.hipJoint.updateTransform();
        this.kneeJoint.updateTransform();
        this.ankleJoint.updateTransform();
    }

    /**
     * 조인트 각도 설정 (IK 솔버에서 사용)
     */
    setJointAngles(hipAngles, kneeAngles, ankleAngles) {
        if (hipAngles) this.hipJoint.setAngles(hipAngles.x || 0, hipAngles.y || 0, hipAngles.z || 0);
        if (kneeAngles) this.kneeJoint.setAngles(kneeAngles.x || 0, kneeAngles.y || 0, kneeAngles.z || 0);
        if (ankleAngles) this.ankleJoint.setAngles(ankleAngles.x || 0, ankleAngles.y || 0, ankleAngles.z || 0);
    }

    /**
     * 현재 foot의 월드 위치 계산
     */
    calculateFootWorldPosition() {
        this.root.updateWorldMatrix();
        const footWorldMatrix = this.footNode.worldMatrix;
        return [footWorldMatrix[12], footWorldMatrix[13], footWorldMatrix[14]];
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