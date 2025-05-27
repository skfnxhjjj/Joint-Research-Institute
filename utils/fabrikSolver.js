"use strict";

class Segment3D {
    constructor(referenceX, referenceY, referenceZ, length, zAngle, yAngle) {
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

    unitVector(vector) {
        const len = Math.sqrt(vector[0]**2 + vector[1]**2 + vector[2]**2);
        return len === 0 ? [0,0,0] : [vector[0]/len, vector[1]/len, vector[2]/len];
    }

    addSegment(length, zAngle, yAngle) {
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
        const dist = Math.sqrt(
            Math.pow(this.basePoint[0] - targetX, 2) +
            Math.pow(this.basePoint[1] - targetY, 2) +
            Math.pow(this.basePoint[2] - targetZ, 2)
        );
        return dist < this.armLength;
    }

    inMarginOfError(targetX, targetY, targetZ) {
        const last = this.segments[this.segments.length - 1];
        const dist = Math.sqrt(
            Math.pow(last.point[0] - targetX, 2) +
            Math.pow(last.point[1] - targetY, 2) +
            Math.pow(last.point[2] - targetZ, 2)
        );
        return dist < this.marginOfError;
    }

    iterate(targetX, targetY, targetZ) {
        const target = [targetX, targetY, targetZ];
        
        // Backward reaching
        for (let i = this.segments.length - 1; i > 0; i--) {
            let dir;
            if (i === this.segments.length - 1) {
                dir = window.m4.subtractVectors(this.segments[i-1].point, target);
                dir = window.m4.normalize(dir);
                this.segments[i-1].point = window.m4.addVectors(
                    window.m4.scaleVector(dir, this.segments[i].length),
                    target
                );
            } else {
                dir = window.m4.subtractVectors(this.segments[i-1].point, this.segments[i].point);
                dir = window.m4.normalize(dir);
                this.segments[i-1].point = window.m4.addVectors(
                    window.m4.scaleVector(dir, this.segments[i].length),
                    this.segments[i].point
                );
            }
        }
        
        // Forward reaching
        for (let i = 0; i < this.segments.length; i++) {
            let dir;
            if (i === 0) {
                dir = window.m4.subtractVectors(this.segments[i].point, this.basePoint);
                dir = window.m4.normalize(dir);
                this.segments[i].point = window.m4.addVectors(
                    window.m4.scaleVector(dir, this.segments[i].length),
                    this.basePoint
                );
            } else if (i === this.segments.length - 1) {
                dir = window.m4.subtractVectors(this.segments[i-1].point, target);
                dir = window.m4.normalize(dir);
                this.segments[i].point = window.m4.addVectors(
                    window.m4.scaleVector(dir, -this.segments[i].length),
                    this.segments[i-1].point
                );
            } else {
                dir = window.m4.subtractVectors(this.segments[i].point, this.segments[i-1].point);
                dir = window.m4.normalize(dir);
                this.segments[i].point = window.m4.addVectors(
                    window.m4.scaleVector(dir, this.segments[i].length),
                    this.segments[i-1].point
                );
            }
        }
    }

    compute(targetX, targetY, targetZ) {
        if (this.isReachable(targetX, targetY, targetZ)) {
            let iterations = 0;
            const maxIterations = 50; // 무한 루프 방지
            
            while (!this.inMarginOfError(targetX, targetY, targetZ) && iterations < maxIterations) {
                this.iterate(targetX, targetY, targetZ);
                iterations++;
            }
            return iterations < maxIterations;
        } else {
            return false;
        }
    }
}

export class AnalyticalIkWithFabrikSolver {
    constructor(coxaLength, femurLength, tibiaLength) {
        this.coxaLen = coxaLength;
        this.femurLen = femurLength;
        this.tibiaLen = tibiaLength;
        this.maxReach = femurLength + tibiaLength;
        this.minReach = Math.abs(femurLength - tibiaLength);
        
        // FABRIK 솔버 초기화
        this.fabrikSolver = new FabrikSolver(0, 0, 0, 0.01);
    }

    solve(targetPosition) {
        const target = [...targetPosition];
        
        const coxaAngle = Math.atan2(target[0], target[2]);
        
        const cosCoxa = Math.cos(coxaAngle);
        const sinCoxa = Math.sin(coxaAngle);
        
        const localTarget = [
            target[0] * cosCoxa + target[2] * sinCoxa,
            target[1],
            -target[0] * sinCoxa + target[2] * cosCoxa
        ];
        
        // FABRIK 솔버 설정 coxa 끝점에서 시작
        const femurStart = [0, this.coxaLen, 0];
        
        this.fabrikSolver = new FabrikSolver(femurStart[0], femurStart[1], femurStart[2], 0.01);
        
        // femur, tibia 세그먼트 추가
        this.fabrikSolver.addSegment(this.femurLen, 0, 0);
        this.fabrikSolver.addSegment(this.tibiaLen, 0, 0);
        
        // FABRIK 수행
        const success = this.fabrikSolver.compute(localTarget[0], localTarget[1], localTarget[2]);
        
        let femurAngle = 0;
        let tibiaAngle = 0;
        
        if (success && this.fabrikSolver.segments.length >= 2) {
            const femurEnd = this.fabrikSolver.segments[0].point;
            const tibiaEnd = this.fabrikSolver.segments[1].point;
            
            const femurVector = [
                femurEnd[0] - femurStart[0],
                femurEnd[1] - femurStart[1],
                femurEnd[2] - femurStart[2]
            ];
            
            const horizontalDist = Math.sqrt(femurVector[0]**2 + femurVector[2]**2);
            femurAngle = Math.atan2(femurVector[1], horizontalDist);

            const targetFromFemur = [
                localTarget[0] - femurStart[0],
                localTarget[1] - femurStart[1], 
                localTarget[2] - femurStart[2]
            ];
            
            const targetDist2D = Math.sqrt(targetFromFemur[0]**2 + targetFromFemur[1]**2 + targetFromFemur[2]**2);
            
            const cosKneeAngle = (this.femurLen**2 + this.tibiaLen**2 - targetDist2D**2) / (2 * this.femurLen * this.tibiaLen);
            const clampedCosKneeAngle = Math.max(-1, Math.min(1, cosKneeAngle));
            
            tibiaAngle = -(Math.acos(clampedCosKneeAngle) - Math.PI);
            
        } else {
            // FABRIK 실패하면 cos 법칙 Two-Bone IK 사용 : https://award09130.tistory.com/11
            const targetFromFemur = [
                localTarget[0] - femurStart[0],
                localTarget[1] - femurStart[1], 
                localTarget[2] - femurStart[2]
            ];
            
            const horizontalDist = Math.sqrt(targetFromFemur[0]**2 + targetFromFemur[2]**2);
            const verticalDist = targetFromFemur[1];
            const targetDist2D = Math.sqrt(horizontalDist**2 + verticalDist**2);
            
            if (targetDist2D > this.maxReach * 0.99) {
                femurAngle = Math.atan2(-verticalDist, horizontalDist);
                tibiaAngle = 0;
            } else if (targetDist2D < this.minReach * 1.1) {
                femurAngle = -Math.PI / 6;
                tibiaAngle = Math.PI / 3;
            } else {
                const cosAngle = (this.femurLen**2 + targetDist2D**2 - this.tibiaLen**2) / (2 * this.femurLen * targetDist2D);
                const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
                
                const cosKneeAngle = (this.femurLen**2 + this.tibiaLen**2 - targetDist2D**2) / (2 * this.femurLen * this.tibiaLen);
                const clampedCosKneeAngle = Math.max(-1, Math.min(1, cosKneeAngle));
                
                const targetAngle = Math.atan2(-verticalDist, horizontalDist);
                const triangleAngle = Math.acos(clampedCosAngle);
                femurAngle = targetAngle + triangleAngle;
                
                tibiaAngle = -(Math.acos(clampedCosKneeAngle) - Math.PI);
            }
        }
        
        const targetDist = Math.sqrt(target[0]**2 + target[1]**2 + target[2]**2);
        
        return {
            coxa: coxaAngle,
            femur: femurAngle,
            tibia: tibiaAngle,
            reachable: success || targetDist <= this.maxReach,
            distance: targetDist
        };
    }


    // 디버깅용
    solveDegrees(targetPosition) {
        const result = this.solve(targetPosition);
        return {
            coxa: result.coxa * 180 / Math.PI,
            femur: result.femur * 180 / Math.PI,
            tibia: result.tibia * 180 / Math.PI,
            reachable: result.reachable,
            distance: result.distance
        };
    }
}