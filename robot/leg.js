import {SceneNode} from "../scene/SceneNode.js";
import {Joint} from "./Joint.js";
import config from "./robotConfig.js";
import {loadMesh, createBoxMesh} from "../utils/meshUtils.js";

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
        const {hip, knee, ankle} = config.jointConfig;

        // 다리 위치 디버깅 정보 출력
        const [x, y, z] = attach;
        const isRightSide = x > 0;
        const position = z > 0.5 ? "앞" : (z < -0.5 ? "뒤" : "중간");
        const colorName = isRightSide ? "초록색(오른쪽)" : "파란색(왼쪽)";
        console.log(`다리 ${index}: ${colorName} ${position} (${x}, ${y}, ${z})`);

        // 다리 색상 결정: 오른쪽은 초록색, 왼쪽은 파란색
        const legColor = isRightSide ? [0.2, 0.8, 0.2, 1.0] : [0.2, 0.2, 0.8, 1.0]; // 초록색 : 파란색

        // 세그먼트 메시 로드 (색상 적용)
        const upperMesh = createBoxMesh(gl, upper.mesh.size, legColor);
        const lowerMesh = createBoxMesh(gl, lower.mesh.size, legColor);
        const footMesh = createBoxMesh(gl, foot.mesh.size, legColor);

        // 조인트 생성 - 각 조인트는 해당 세그먼트의 끝에 위치
        this.hipJoint = new Joint({
            name: `leg${index}_hip`,
            ...hip,
            position: [0, 0, 0] // body에서 다리가 시작하는 위치
        });

        this.kneeJoint = new Joint({
            name: `leg${index}_knee`,
            ...knee,
            position: [0, upper.mesh.size[1], 0] // upper 세그먼트 끝에 위치
        });

        this.ankleJoint = new Joint({
            name: `leg${index}_ankle`,
            ...ankle,
            position: [0, lower.mesh.size[1], 0] // lower 세그먼트 끝에 위치
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

        const footNode = new SceneNode({
            name: `leg${index}_foot`,
            mesh: footMesh,
            pivot: foot.pivot,
            localMatrix: m4.identity()
        });

        // 조인트 체인 구성: body -> hip -> upper -> knee -> lower -> ankle -> foot
        // Hip joint는 body에 직접 연결되고, upper 세그먼트를 자식으로 가짐
        this.hipJoint.node.addChild(upperNode);
        
        // Knee joint는 upper 세그먼트 끝에 위치하고, lower 세그먼트를 자식으로 가짐
        upperNode.addChild(this.kneeJoint.node);
        this.kneeJoint.node.addChild(lowerNode);
        
        // Ankle joint는 lower 세그먼트 끝에 위치하고, foot 세그먼트를 자식으로 가짐
        lowerNode.addChild(this.ankleJoint.node);
        this.ankleJoint.node.addChild(footNode);

        // 루트는 hip 조인트
        this.root = this.hipJoint.node;
        
        // 세그먼트 노드들 저장
        this.upperNode = upperNode;
        this.lowerNode = lowerNode;
        this.footNode = footNode;

        // 각 다리의 초기 hip 각도 설정 (body에서 바깥쪽으로 향하도록)
        this.setInitialHipAngle(index, attach);

        // 초기 변환 업데이트
        this.updateJoints();

        // 초기 foot 위치 계산 - 현실적인 위치로 설정
        this.root.updateWorldMatrix();
        this.attachWorld = m4.transformPoint(this.root.worldMatrix, [0, 0, 0]);
        
        // 현실적인 초기 foot 위치 계산 (다리 길이 고려)
        const groundHeight = -0.8;
        const localOffset = [attach[0] * 0.3, 0, attach[2] * 0.3];
        const initialFootPosition = [
            this.attachWorld[0] + localOffset[0],
            groundHeight,
            this.attachWorld[2] + localOffset[2]
        ];
        
        this.footPosition = [...initialFootPosition];
        this.footTarget = [...initialFootPosition];
        
        console.log(`다리 ${index} 초기 foot 위치: [${initialFootPosition[0].toFixed(2)}, ${initialFootPosition[1].toFixed(2)}, ${initialFootPosition[2].toFixed(2)}]`);
        
        this.phase = "support";
    }

    /**
     * 각 다리의 초기 hip 각도를 설정
     */
    setInitialHipAngle(legIndex, attachPoint) {
        // 다리의 위치에 따라 초기 hip 각도 계산
        const [x, y, z] = attachPoint;
        
        // 6개 다리의 배치:
        // 0: 오른쪽 앞 (0.4, 0, 1)
        // 1: 오른쪽 중간 (0.4, 0, 0) 
        // 2: 오른쪽 뒤 (0.4, 0, -1)
        // 3: 왼쪽 앞 (-0.4, 0, 1)
        // 4: 왼쪽 중간 (-0.4, 0, 0)
        // 5: 왼쪽 뒤 (-0.4, 0, -1)
        
        let initialHipAngle = 0;
        
        if (x > 0) {
            // 오른쪽 다리들 - IK가 선호하는 방향으로 설정
            if (z > 0.5) {
                // 앞쪽 다리 (index 0)
                initialHipAngle = Math.PI / 6; // 30도 (오른쪽 앞으로)
            } else if (z < -0.5) {
                // 뒤쪽 다리 (index 2) - IK가 0도 근처를 선호하므로 수정
                initialHipAngle = 0; // 0도 (정면으로)
            } else {
                // 중간 다리 (index 1)
                initialHipAngle = Math.PI / 2; // 90도 (완전히 오른쪽으로)
            }
        } else {
            // 왼쪽 다리들 - IK가 선호하는 방향으로 설정
            if (z > 0.5) {
                // 앞쪽 다리 (index 3) - IK가 120도 근처를 선호하므로 수정
                initialHipAngle = 2 * Math.PI / 3; // 120도 (왼쪽 앞으로)
            } else if (z < -0.5) {
                // 뒤쪽 다리 (index 5)
                initialHipAngle = Math.PI + Math.PI / 6; // 210도 (왼쪽 뒤로)
            } else {
                // 중간 다리 (index 4)
                initialHipAngle = -Math.PI / 2; // -90도 (완전히 왼쪽으로)
            }
        }
        
        // 디버깅 정보 출력
        console.log(`다리 ${legIndex} 초기 hip 각도: ${(initialHipAngle * 180 / Math.PI).toFixed(1)}도`);
        
        // Hip 각도 설정
        this.hipJoint.setAngle('y', initialHipAngle);
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