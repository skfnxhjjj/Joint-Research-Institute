import { SceneNode } from "/scene/SceneNode.js";
import { Joint } from "/robot/Joint.js";
import { createBoxMesh } from "/utils/meshUtils.js";
import { robotConfig } from "./robotConfig.js";
import { AnalyticalIkWithFabrikSolver } from "/utils/fabrikSolver.js";

export class Leg {
  constructor(gl, name, meshConfigs = {}) {
    const coxaMesh =
      meshConfigs.coxa ||
      createBoxMesh(gl, robotConfig.leg.coxa.size, robotConfig.leg.coxa.color);
    const femurMesh =
      meshConfigs.femur ||
      createBoxMesh(
        gl,
        robotConfig.leg.femur.size,
        robotConfig.leg.femur.color
      );
    const tibiaMesh =
      meshConfigs.tibia ||
      createBoxMesh(
        gl,
        robotConfig.leg.tibia.size,
        robotConfig.leg.tibia.color
      );

    // 관절 노드 - 각 관절은 이전 세그먼트의 끝에 위치

    this.coxaBase = new SceneNode({
      name: `${name}_coxaBase`,
    });

    this.coxaJoint = new Joint({
      name: `${name}_coxaJoint`,
      axis: [0, 1, 0],
      offset: [0, 0, 0],
    });

    this.femurJoint = new Joint({
      name: `${name}_femurJoint`,
      axis: [1, 0, 0],
      offset: [0, robotConfig.leg.coxa.size[1], 0],
    });
    this.tibiaJoint = new Joint({
      name: `${name}_tibiaJoint`,
      axis: [1, 0, 0],
      offset: [0, robotConfig.leg.femur.size[1], 0],
    });

    // 세그먼트(실제 limb 메쉬) 노드 - 각 세그먼트는 해당 관절에서 시작
    this.coxaSegment = new SceneNode({
      name: `${name}_coxaSegment`,
      mesh: coxaMesh,
    });
    this.femurSegment = new SceneNode({
      name: `${name}_femurSegment`,
      mesh: femurMesh,
    });
    this.tibiaSegment = new SceneNode({
      name: `${name}_tibiaSegment`,
      mesh: tibiaMesh,
    });

    // 트리 구조 연결: body → coxaBase → coxaJoint → coxaSegment → femurJoint ...
    this.coxaBase.addChild(this.coxaJoint);
    this.coxaJoint.addChild(this.coxaSegment);
    this.coxaSegment.addChild(this.femurJoint);
    this.femurJoint.addChild(this.femurSegment);
    this.femurSegment.addChild(this.tibiaJoint);
    this.tibiaJoint.addChild(this.tibiaSegment);

    // IK 솔버 초기화
    this.ikSolver = new AnalyticalIkWithFabrikSolver(
      robotConfig.leg.coxa.size[1],
      robotConfig.leg.femur.size[1],
      robotConfig.leg.tibia.size[1]
    );

    // leg 트리의 루트노드 (body에 연결)
    this.rootNode = this.coxaBase;
  }

  // 예시: gait/IK update용 메서드
  updateGait(gaitParams) {
    // gaitParams.targetPosition, gaitParams.phase 등 활용 가능
    this.solveIK(gaitParams.targetPosition);
  }

  solveIK(targetPosition) {
    // coxa Joint의 월드 -> 로컬 변환
    // const invCoxaWorld = m4.inverse(this.coxaJoint.worldMatrix);
    // const localTarget = m4.transformPoint(invCoxaWorld, targetPosition);
    const coxaBaseWorld = this.coxaBase.getWorldPosition();

    const invCoxaBaseWorld = m4.inverse(this.coxaBase.worldMatrix);
    const localTarget = m4.transformPoint(invCoxaBaseWorld, targetPosition);

    // const result = this.ikSolver.solve(localTarget);
    const result = this.ikSolver.solve(localTarget);

    // IK 솔버를 사용하여 각도 계산
    // const result = this.ikSolver.solve(targetPosition);

    // 디버깅: IK 입력 좌표계, 각도, 도달 가능 여부 등 출력
    // if (Math.random() < 0.1) { // 10% 확률로만 출력 (너무 많지 않게)
    //     console.log('Leg:', this.rootNode.name);
    //     console.log('  IK Target (입력):', targetPosition);
    //     console.log('  IK Result:', result);
    //     const degrees = this.ikSolver.solveDegrees(targetPosition);
    //     console.log('  Angles (deg):', degrees);
    //     console.log('  Reachable:', result.reachable, 'Distance:', result.distance);
    //     // 각 관절의 worldMatrix에서 y값
    //     console.log('  Coxa Y:', this.coxaJoint.worldMatrix[13]);
    //     console.log('  Femur Y:', this.femurJoint.worldMatrix[13]);
    //     console.log('  Tibia Y:', this.tibiaJoint.worldMatrix[13]);
    //     console.log('  TibiaEnd Y:', this.tibiaSegment.worldMatrix[13]);
    // }

    // 각도가 유효한지 확인하고 적용
    if (!isNaN(result.coxa) && !isNaN(result.femur) && !isNaN(result.tibia)) {
      this.coxaJoint.transforms.ik = m4.yRotation(result.coxa);
      this.femurJoint.transforms.ik = m4.xRotation(result.femur);
      this.tibiaJoint.transforms.ik = m4.xRotation(result.tibia);
    }
  }

  getTibiaEndWorldPosition() {
    // tibiaSegment의 월드 행렬에서 위치 추출
    const m = this.tibiaSegment.worldMatrix;
    return [m[12], m[13], m[14]];
  }
}
