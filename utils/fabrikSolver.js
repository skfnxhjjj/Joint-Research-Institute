"use strict";

// 벡터 유틸리티 함수들
const vectorUtils = {
    subtractVectors: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    addVectors: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    scaleVector: (v, scale) => [v[0] * scale, v[1] * scale, v[2] * scale],
    normalize: (v) => {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return len === 0 ? [0, 0, 0] : [v[0] / len, v[1] / len, v[2] / len];
    },
    distance: (a, b) => {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1]; 
        const dz = a[2] - b[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
};

class Segment3D {
    constructor(referenceX, referenceY, referenceZ, length, zAngle = 0, yAngle = 0) {
        this.zAngle = zAngle;
        this.yAngle = yAngle;
        this.length = length;

        let zRad = zAngle * Math.PI / 180;
        let yRad = yAngle * Math.PI / 180;

        let deltaX = Math.cos(zRad) * length;
        let deltaY = Math.sin(zRad) * length;
        let deltaZ = Math.sin(yRad) * length;

        let newX = referenceX + deltaX;
        let newY = referenceY + deltaY;
        let newZ = referenceZ + deltaZ;

        this.point = [newX, newY, newZ];
    }
}

class FabrikSolver {
    constructor(baseX = 0, baseY = 0, baseZ = 0, marginOfError = 0.01) {
        this.basePoint = [baseX, baseY, baseZ];
        this.segments = [];
        this.armLength = 0;
        this.marginOfError = marginOfError;
    }

    addSegment(length, zAngle = 0, yAngle = 0) {
        let segment;
        if (this.segments.length > 0) {
            const last = this.segments[this.segments.length - 1];
            segment = new Segment3D(
                last.point[0],
                last.point[1],
                last.point[2],
                length,
                zAngle + last.zAngle,
                last.yAngle + yAngle
            );
        } else {
            segment = new Segment3D(
                this.basePoint[0],
                this.basePoint[1],
                this.basePoint[2],
                length,
                zAngle,
                yAngle
            );
        }
        this.armLength += segment.length;
        this.segments.push(segment);
    }

    isReachable(targetX, targetY, targetZ) {
        const dist = vectorUtils.distance(this.basePoint, [targetX, targetY, targetZ]);
        return dist <= this.armLength;
    }

    inMarginOfError(targetX, targetY, targetZ) {
        const last = this.segments[this.segments.length - 1];
        const dist = vectorUtils.distance(last.point, [targetX, targetY, targetZ]);
        return dist < this.marginOfError;
    }

    iterate(targetX, targetY, targetZ) {
        const target = [targetX, targetY, targetZ];
        
        // Backward reaching
        for (let i = this.segments.length - 1; i > 0; i--) {
            let dir;
            if (i === this.segments.length - 1) {
                dir = vectorUtils.subtractVectors(this.segments[i-1].point, target);
                dir = vectorUtils.normalize(dir);
                this.segments[i-1].point = vectorUtils.addVectors(
                    vectorUtils.scaleVector(dir, this.segments[i].length),
                    target
                );
            } else {
                dir = vectorUtils.subtractVectors(this.segments[i-1].point, this.segments[i].point);
                dir = vectorUtils.normalize(dir);
                this.segments[i-1].point = vectorUtils.addVectors(
                    vectorUtils.scaleVector(dir, this.segments[i].length),
                    this.segments[i].point
                );
            }
        }
        
        // Forward reaching
        for (let i = 0; i < this.segments.length; i++) {
            let dir;
            if (i === 0) {
                dir = vectorUtils.subtractVectors(this.segments[i].point, this.basePoint);
                dir = vectorUtils.normalize(dir);
                this.segments[i].point = vectorUtils.addVectors(
                    vectorUtils.scaleVector(dir, this.segments[i].length),
                    this.basePoint
                );
            } else if (i === this.segments.length - 1) {
                dir = vectorUtils.subtractVectors(this.segments[i-1].point, target);
                dir = vectorUtils.normalize(dir);
                this.segments[i].point = vectorUtils.addVectors(
                    vectorUtils.scaleVector(dir, -this.segments[i].length),
                    this.segments[i-1].point
                );
            } else {
                dir = vectorUtils.subtractVectors(this.segments[i].point, this.segments[i-1].point);
                dir = vectorUtils.normalize(dir);
                this.segments[i].point = vectorUtils.addVectors(
                    vectorUtils.scaleVector(dir, this.segments[i].length),
                    this.segments[i-1].point
                );
            }
        }
    }

    compute(targetX, targetY, targetZ, maxIterations = 10) {
        if (!this.isReachable(targetX, targetY, targetZ)) {
            // 도달 불가능한 경우 최대한 가까이 가도록 방향 조정
            const direction = vectorUtils.normalize(
                vectorUtils.subtractVectors([targetX, targetY, targetZ], this.basePoint)
            );
            const reachableTarget = vectorUtils.addVectors(
                this.basePoint,
                vectorUtils.scaleVector(direction, this.armLength * 0.95)
            );
            targetX = reachableTarget[0];
            targetY = reachableTarget[1]; 
            targetZ = reachableTarget[2];
        }

        let iterations = 0;
        while (!this.inMarginOfError(targetX, targetY, targetZ) && iterations < maxIterations) {
            this.iterate(targetX, targetY, targetZ);
            iterations++;
        }
        
        return iterations < maxIterations; // 수렴 여부 반환
    }

    /**
     * 현재 세그먼트들의 관절 각도를 계산하여 반환
     */
    getJointAngles() {
        const angles = [];
        
        for (let i = 0; i < this.segments.length; i++) {
            let direction;
            
            if (i === 0) {
                direction = vectorUtils.subtractVectors(this.segments[i].point, this.basePoint);
            } else {
                direction = vectorUtils.subtractVectors(this.segments[i].point, this.segments[i-1].point);
            }
            
            direction = vectorUtils.normalize(direction);
            
            // 방향이 너무 작으면 이전 각도 유지 (안정성)
            if (Math.abs(direction[0]) < 0.001 && Math.abs(direction[1]) < 0.001 && Math.abs(direction[2]) < 0.001) {
                angles.push({ x: 0, y: 0, z: 0 });
                continue;
            }
            
            // Y축 회전 (Hip - 좌우 회전)
            let yaw = 0;
            const horizontalLength = Math.sqrt(direction[0]**2 + direction[2]**2);
            
            if (horizontalLength > 0.001) {
                yaw = Math.atan2(direction[0], direction[2]);
            }
            
            // X축 회전 (Pitch - 상하 회전)
            let pitch = 0;
            if (horizontalLength > 0.001) {
                pitch = Math.atan2(-direction[1], horizontalLength);
            }
            
            angles.push({
                x: pitch,
                y: yaw,
                z: 0  // 롤 회전은 현재 사용하지 않음
            });
        }
        
        return angles;
    }
}

// Default export로 변경
export default FabrikSolver;