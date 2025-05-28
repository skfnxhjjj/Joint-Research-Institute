import { SceneNode } from '../scene/SceneNode.js';
import { Joint } from './Joint.js';
import { createBoxMesh } from '../utils/meshUtils.js';
import { robotConfig } from './robotConfig.js';
import { solveLegIK, applyLegIK } from '../utils/ik.js';

export class Leg {
    constructor(gl, name, meshConfigs = {}) {
        const coxaMesh = meshConfigs.coxa ||
            createBoxMesh(gl, robotConfig.leg.coxa.size, robotConfig.leg.coxa.color);
        const femurMesh = meshConfigs.femur ||
            createBoxMesh(gl, robotConfig.leg.femur.size, robotConfig.leg.femur.color);
        const tibiaMesh = meshConfigs.tibia ||
            createBoxMesh(gl, robotConfig.leg.tibia.size, robotConfig.leg.tibia.color);

        this.legRoot = new SceneNode({ name: `${name}_legRoot` });

        this.coxaJoint = new Joint({
            name: `${name}_coxaJoint`,
            axis: [0, 1, 0],
            offset: [0, 0, 0]
        });
        this.femurJoint = new Joint({
            name: `${name}_femurJoint`,
            axis: [1, 0, 0],
            offset: [0, robotConfig.leg.coxa.size[1], 0]
        });
        this.tibiaJoint = new Joint({
            name: `${name}_tibiaJoint`,
            axis: [1, 0, 0],
            offset: [0, robotConfig.leg.femur.size[1], 0]
        });

        this.coxaSegment = new SceneNode({
            name: `${name}_coxaSegment`,
            mesh: coxaMesh
        });
        this.femurSegment = new SceneNode({
            name: `${name}_femurSegment`,
            mesh: femurMesh
        });
        this.tibiaSegment = new SceneNode({
            name: `${name}_tibiaSegment`,
            mesh: tibiaMesh
        });

        // Decorations
        this.femurShell = new SceneNode({
            name: `${name}_femurArm`,
            mesh: createBoxMesh(gl, robotConfig.leg.femur.shell.size, robotConfig.leg.femur.shell.color)
        });
        this.femurShell.transforms.base = m4.translation(0, 0.05, -0.05);

        this.tibiaShell = new SceneNode({
            name: `${name}_tibiaShell`,
            mesh: createBoxMesh(gl, robotConfig.leg.tibia.shell.size, robotConfig.leg.tibia.shell.color)
        });
        this.tibiaShell.transforms.base = m4.translation(0, 0.05, -0.05);

        this.footEnd = new Joint({
            name: `${name}_footEnd`,
            offset: [0, robotConfig.leg.tibia.size[1], 0]
        });

        this.foot = new SceneNode({ name: `${name}_foot` });

        this.legRoot.addChild(this.coxaJoint);
        this.coxaJoint._parent = this.legRoot;
        this.coxaJoint.addChild(this.coxaSegment);
        this.coxaSegment.addChild(this.femurJoint);
        this.femurSegment.addChild(this.femurShell);
        this.femurJoint.addChild(this.femurSegment);
        this.femurSegment.addChild(this.tibiaJoint);
        this.tibiaJoint.addChild(this.tibiaSegment);
        this.tibiaSegment.addChild(this.footEnd);
        this.tibiaSegment.addChild(this.tibiaShell);

        this.rootNode = this.legRoot;
    }

    updateGait(gaitParams) {
        // gaitParams에 따라 각 joint의 transforms.gait 수정
    }

    solveIK(targetPosition) {
        const angles = solveLegIK(
            this.coxaJoint,
            this.femurJoint,
            this.tibiaJoint,
            targetPosition
        );
        applyLegIK(this.coxaJoint, this.femurJoint, this.tibiaJoint, angles);
        this.legRoot.traverse(node => node.updateLocalMatrix());
        this.legRoot.computeWorld();
        return angles;
    }
}