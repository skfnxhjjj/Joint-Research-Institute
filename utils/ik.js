import { robotConfig } from '../robot/robotConfig.js';

export function solveLegIK(coxaJoint, femurJoint, tibiaJoint, targetWorldPos) {
    const legRoot = coxaJoint._parent;
    const targetInLegRoot = m4.transformPoint(m4.inverse(legRoot.worldMatrix), targetWorldPos);
    const coxaYaw = Math.atan2(targetInLegRoot[0], targetInLegRoot[2]);

    coxaJoint.transforms.ik = m4.yRotation(coxaYaw);

    const coxaWorld = coxaJoint.worldMatrix;
    const invCoxaWorld = m4.inverse(coxaWorld);
    const footLocal = m4.transformPoint(invCoxaWorld, targetWorldPos);

    let z = footLocal[2] - 0.05;
    let y = footLocal[1] - 0.3;

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
    }

    const femurJointWorld = [femurJoint.worldMatrix[12], femurJoint.worldMatrix[13], femurJoint.worldMatrix[14]];
    const controllerToFemurJointWorld = [
        targetWorldPos[0] - femurJointWorld[0],
        targetWorldPos[1] - femurJointWorld[1],
        targetWorldPos[2] - femurJointWorld[2]
    ];

    const a = femurLen;
    const b = tibiaLen;
    const c = clampedDist;
    const cosTibia = (a * a + b * b - c * c) / (2 * a * b);
    const tibiaAngle = -Math.acos(Math.max(-1, Math.min(1, cosTibia)));

    const cosFemur = (a * a + c * c - b * b) / (2 * a * c);
    const femurAngle0 = Math.acos(Math.max(-1, Math.min(1, cosFemur)));

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

export function applyLegIK(coxaJoint, femurJoint, tibiaJoint, angles) {
    coxaJoint.transforms.ik = m4.yRotation(angles.coxa);
    femurJoint.transforms.ik = m4.xRotation(-angles.femur + Math.PI / 2);
    tibiaJoint.transforms.ik = m4.xRotation(angles.tibia + Math.PI);
} 