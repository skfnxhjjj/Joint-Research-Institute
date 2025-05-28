import { robotConfig } from '../robot/robotConfig.js';

/**
 * 3-DOF leg IK (coxa, femur, tibia)
 * @param {SceneNode} coxaJoint
 * @param {SceneNode} femurJoint
 * @param {SceneNode} tibiaJoint
 * @param {Array} targetWorldPos - [x, y, z] in world coordinates
 * @returns {Object} {coxa: rad, femur: rad, tibia: rad}
 */
export function solveLegIK(coxaJoint, femurJoint, tibiaJoint, targetWorldPos) {
    // 1. coxaYaw 계산: coxaJoint의 부모(legRoot) 기준에서 타겟을 변환
    const legRoot = coxaJoint._parent;
    const targetInLegRoot = m4.transformPoint(m4.inverse(legRoot.worldMatrix), targetWorldPos);
    const coxaYaw = Math.atan2(targetInLegRoot[0], targetInLegRoot[2]);

    // 2. coxaJoint.transforms.ik에 yaw 적용 (coxaYaw가 타겟을 항상 앞(z>0)으로 돌려놓음)
    coxaJoint.transforms.ik = m4.yRotation(coxaYaw);

    // 3. coxaYaw 적용 후, 타겟을 coxaJoint의 로컬로 변환 (이제 z>0이 항상 앞 방향)
    const coxaWorld = coxaJoint.worldMatrix;
    const invCoxaWorld = m4.inverse(coxaWorld);
    const footLocal = m4.transformPoint(invCoxaWorld, targetWorldPos);

    // 4. femurJoint의 offset(y)만큼 평면 IK 입력에서 보정
    let z = footLocal[2] - 0.05; // 항상 z>0 (앞 방향)
    let y = footLocal[1] - 0.3;

    // clampedDist 보정 (방향 유지)
    const femurLen = robotConfig.leg.femur.size[1];
    const tibiaLen = robotConfig.leg.tibia.size[1] - 0.1;
    let dist = Math.sqrt(z * z + y * y);
    const maxReach = femurLen + tibiaLen;
    let clampedDist = Math.min(dist, maxReach);
    if (dist > maxReach && dist > 1e-6) {
        const scale = clampedDist / dist;
        z *= scale;
        y *= scale;
        dist = clampedDist;
        console.warn('[IK] Target out of reach.');
    }

    // 디버그: two bone IK의 시작점, 끝점, 입력값 등
    const femurJointWorld = [femurJoint.worldMatrix[12], femurJoint.worldMatrix[13], femurJoint.worldMatrix[14]];
    const controllerToFemurJointWorld = [
        targetWorldPos[0] - femurJointWorld[0],
        targetWorldPos[1] - femurJointWorld[1],
        targetWorldPos[2] - femurJointWorld[2]
    ];

    // tibia angle (knee)
    const a = femurLen;
    const b = tibiaLen;
    const c = clampedDist;
    const cosTibia = (a * a + b * b - c * c) / (2 * a * b);
    const tibiaAngle = -Math.acos(Math.max(-1, Math.min(1, cosTibia)));
    // femur angle (hip)
    const cosFemur = (a * a + c * c - b * b) / (2 * a * c);
    const femurAngle0 = Math.acos(Math.max(-1, Math.min(1, cosFemur)));
    // 타겟이 너무 가까우면 (팔꿈치 위로), 일반적이면 (팔꿈치 아래로)
    let femurAngle;
    if (dist < Math.abs(femurLen - tibiaLen) + 1e-6) {
        femurAngle = Math.atan2(y, z) - femurAngle0;
    } else {
        femurAngle = Math.atan2(y, z) + femurAngle0;
    }

    return {
        coxa: coxaYaw,
        femur: femurAngle,
        tibia: tibiaAngle
    };
}

/**
 * 각 joint의 transforms.ik에 회전 행렬을 할당
 */
export function applyLegIK(coxaJoint, femurJoint, tibiaJoint, angles) {
    coxaJoint.transforms.ik = m4.yRotation(angles.coxa);
    femurJoint.transforms.ik = m4.xRotation(-angles.femur + Math.PI / 2);
    tibiaJoint.transforms.ik = m4.xRotation(angles.tibia + Math.PI);
}
