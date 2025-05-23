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
      while (!this.inMarginOfError(targetX, targetY, targetZ)) {
        this.iterate(targetX, targetY, targetZ);
      }
    } else {
      return;
    }
  }
}

export { FabrikSolver };
