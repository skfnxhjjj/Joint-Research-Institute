import {createBody} from "./body.js";
import {Leg} from "./leg.js";
import {SceneNode} from "../scene/SceneNode.js";
import config from "./robotConfig.js";

export async function buildSpider(gl) {
    const body = await createBody(gl);
    body.legs = [];
    for (let i = 0; i < config.mountPoints.length; i++) {
        const leg = await Leg.create(gl, i, config.mountPoints[i]);
        leg.attach = config.mountPoints[i];
        
        // 각 다리를 위한 중간 노드 생성 (mount point에 위치)
        const legMountNode = new SceneNode({
            name: `leg${i}_mount`,
            mesh: null,
            localMatrix: m4.identity()
        });
        
        // Mount node를 body의 mount point에 위치시킴
        legMountNode.transforms.base = m4.translation(...config.mountPoints[i]);
        
        // Hip joint는 mount node의 자식으로 추가 (위치는 0,0,0)
        leg.hipJoint.node.transforms.base = m4.identity();
        
        // Body -> Mount Node -> Hip Joint 순서로 연결
        body.addChild(legMountNode);
        legMountNode.addChild(leg.root);
        body.legs.push(leg);
    }

    body.transforms.base = m4.translation(0, 0, 0);
    body.traverse(node => node.updateLocalMatrix?.());

    for (let i = 0; i < body.legs.length; i++) {
        const leg = body.legs[i];
        const worldAttach = m4.transformPoint(body.worldMatrix, leg.attach);
        leg.footPosition = worldAttach;
        leg.footTarget = worldAttach.slice();
        leg.isMoving = false;
        leg.isGrounded = true;
        leg.phase = "support";
    }

    return body;
}