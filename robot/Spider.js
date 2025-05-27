import { SceneNode } from "/scene/SceneNode.js";
import { Leg } from "/robot/Leg.js";
import { createBoxMesh } from "../utils/meshUtils.js";
import { robotConfig } from "./robotConfig.js";

export class Spider {
  constructor(gl, numLegs = 6, meshConfigsPerLeg = []) {
    this.gl = gl;
    // Create root node
    this.root = new SceneNode({
      name: "spiderRoot",
      mesh: createBoxMesh(gl, [0.1, 0.1, 0.1], [1, 1, 0]),
    });
    // Body node
    this.body = new SceneNode({
      name: "body",
      mesh: createBoxMesh(gl, robotConfig.body.size, robotConfig.body.color),
    });
    this.root.addChild(this.body);

    // Initialize legs
    this.legs = [];
    const R = robotConfig.body.radius || robotConfig.body.size[2] / 2;
    for (let i = 0; i < numLegs; i++) {
      const theta = (i * 2 * Math.PI) / numLegs;
      const x = R * Math.cos(theta);
      const z = R * Math.sin(theta);
      const leg = new Leg(gl, `leg${i + 1}`, meshConfigsPerLeg[i] || {});
      // Position and orient each coxa joint

      leg.coxaBase.transforms.base = m4.multiply(
        m4.translation(x*0.2, 0, z*0.2),
        m4.multiply(
            m4.yRotation(theta),
            m4.zRotation(-Math.PI / 3)
        )
      )
      leg.coxaJoint.transforms.base = m4.identity(); // offset은 0,0,0
    // leg.coxaBase.transforms.base = m4.translation(x, 0, z);
    // leg.coxaJoint.transforms.base = m4.yRotation(theta);

    

      
      // leg.coxaJoint.transforms.base = m4.multiply(
      //     m4.translation(x, 0, z),
      //     m4.multiply(
      //         m4.yRotation(theta),
      //         m4.zRotation(-Math.PI / 3)));
      this.root.addChild(leg.rootNode);
      this.legs.push(leg);
    }
  }

  update(gaitParamsList) {
    if (
      Array.isArray(gaitParamsList) &&
      gaitParamsList.length === this.legs.length
    ) {
      this.legs.forEach((leg, i) => {
        leg.updateGait(gaitParamsList[i]);
      });
    }
    // Update transforms
    this.root.traverse((node) => node.updateLocalMatrix());
    this.root.computeWorld();
  }
}
