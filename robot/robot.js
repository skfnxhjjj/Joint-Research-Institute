import {SceneNode} from '/scene/SceneNode.js';
import {Leg} from '/robot/Leg.js';
import {createBoxMesh} from "../utils/meshUtils.js";
import {robotConfig} from "./robotConfig.js";

// 계층적 모델 트리 생성 함수
export function buildSpider(gl, numLegs = 6) {
    // body(root) 생성
    const spiderRoot = new SceneNode({name: 'spiderRoot'});
    const bodyMesh = createBoxMesh(gl, robotConfig.body.size, robotConfig.body.color);
    const body = new SceneNode({name: 'body', mesh: bodyMesh});

    const legs = [];
    for (let i = 0; i < numLegs; i++) {
        const leg = new Leg(gl, `leg${i + 1}`);
        spiderRoot.addChild(leg.rootNode);
        legs.push(leg);
    }
    spiderRoot.addChild(body);
    return {root: spiderRoot, legs};
}