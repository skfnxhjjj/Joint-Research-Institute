import {SceneNode} from "../scene/SceneNode.js";

/**
 * Joint 클래스 - IK를 위한 관절 노드
 * 회전각 정보만을 담고 있음
 */
export class Joint {
    constructor({
        name,
        type = "revolute", // revolute, prismatic, fixed
        axis = "y", // x, y, z - 주 회전축
        limits = { min: -Math.PI, max: Math.PI },
        position = [0, 0, 0] // 조인트의 상대적 위치
    }) {
        this.name = name;
        this.type = type;
        this.axis = axis;
        this.limits = limits;
        this.position = position;
        
        // 현재 회전각들 (라디안)
        this.angles = {
            x: 0,
            y: 0,
            z: 0
        };
        
        // 목표 회전각들 (IK에서 계산될 값)
        this.targetAngles = {
            x: 0,
            y: 0,
            z: 0
        };
        
        // SceneNode 생성 (실제 변환을 담당)
        this.node = new SceneNode({
            name: name,
            mesh: null, // 조인트는 보이지 않음
            localMatrix: m4.identity()
        });
        
        // 초기 위치 설정
        this.node.transforms.base = m4.translation(...position);
    }
    
    /**
     * 현재 각도를 기반으로 변환 매트릭스 업데이트
     */
    updateTransform() {
        const rotX = m4.xRotation(this.angles.x);
        const rotY = m4.yRotation(this.angles.y);
        const rotZ = m4.zRotation(this.angles.z);
        
        // 회전 순서: Z -> Y -> X
        const rotation = m4.multiply(rotX, m4.multiply(rotY, rotZ));
        
        this.node.transforms.ik = rotation;
        this.node.updateLocalMatrix();
    }
    
    /**
     * 특정 축의 각도 설정 (제한 범위 내에서)
     */
    setAngle(axis, angle) {
        if (axis === this.axis) {
            // 주 회전축인 경우 제한 체크
            angle = Math.max(this.limits.min, Math.min(this.limits.max, angle));
        }
        
        this.angles[axis] = angle;
        this.updateTransform();
    }
    
    /**
     * 모든 각도를 한번에 설정
     */
    setAngles(x = 0, y = 0, z = 0) {
        this.angles.x = x;
        this.angles.y = y;
        this.angles.z = z;
        this.updateTransform();
    }
    
    /**
     * 목표 각도 설정 (IK 솔버에서 사용)
     */
    setTargetAngles(x = 0, y = 0, z = 0) {
        this.targetAngles.x = x;
        this.targetAngles.y = y;
        this.targetAngles.z = z;
    }
    
    /**
     * 목표 각도로 보간 이동
     */
    interpolateToTarget(alpha = 0.1) {
        const lerp = (a, b, t) => a + (b - a) * t;
        
        this.angles.x = lerp(this.angles.x, this.targetAngles.x, alpha);
        this.angles.y = lerp(this.angles.y, this.targetAngles.y, alpha);
        this.angles.z = lerp(this.angles.z, this.targetAngles.z, alpha);
        
        this.updateTransform();
    }
    
    /**
     * 현재 각도 정보 반환
     */
    getAngles() {
        return { ...this.angles };
    }
    
    /**
     * 월드 변환 매트릭스 반환
     */
    getWorldMatrix() {
        return this.node.worldMatrix;
    }
} 