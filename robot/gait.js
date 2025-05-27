// Animation for Tripod Gait
export class TripodGait {
    constructor(numLegs, bodyCenter, legBasePositions, stepLength, stepHeight, cycleTime) {
        this.numLegs = numLegs;
        this.bodyCenter = bodyCenter; // [x, y, z]
        this.legBasePositions = legBasePositions; // 각 다리의 body 기준 base 위치
        this.stepLength = stepLength;
        this.stepHeight = stepHeight;
        this.cycleTime = cycleTime; // 한 사이클 시간(초)
        this.phaseOffsets = [0, 0.5, 0, 0.5, 0, 0.5]; // 6족 트라이포드 페이즈
        this.time = 0;
    }

    update(dt, bodyCenter, bodyYaw) {
        this.time += dt;
        this.bodyCenter = bodyCenter;
        const gaitParamsList = [];
        for (let i = 0; i < this.numLegs; i++) {
            const phase = ((this.time / this.cycleTime) + this.phaseOffsets[i]) % 1;
            let footPos = [0, 0, 0];
            if (phase < 0.5) { // 스윙
                const t = phase / 0.5;
                footPos = [
                    this.legBasePositions[i][0] + this.stepLength * (t - 0.5),
                    0 + this.stepHeight * Math.sin(Math.PI * t),
                    this.legBasePositions[i][2]
                ];
            } else { // 스탠스
                const t = (phase - 0.5) / 0.5;
                footPos = [
                    this.legBasePositions[i][0] - this.stepLength * (t - 0.5),
                    0,
                    this.legBasePositions[i][2]
                ];
            }
            const cos = Math.cos(bodyYaw), sin = Math.sin(bodyYaw);
            const x = footPos[0] * cos + footPos[2] * sin + bodyCenter[0];
            const z = -footPos[0] * sin + footPos[2] * cos + bodyCenter[2];
            gaitParamsList.push({
                targetPosition: [x, footPos[1], z],
                phase: phase,
                localFootPos: footPos
            });
        }
        return gaitParamsList;
    }
}