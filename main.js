"use strict";

import {initRenderer, renderScene} from "./scene/renderer.js";
import {SceneNode} from "./scene/SceneNode.js";
import {createGround} from "./scene/worldInit.js";
import {buildSpider} from "./robot/robot.js";
import {raycast} from "./utils/raycast.js";
import * as gait from "./robot/gait.js";
import * as ik from "./robot/ik.js";
import config from "./robot/robotConfig.js";
import {createBoxMesh} from "./utils/meshUtils.js";

let gl;
const eye = [10, 10, 10];
const at = [0, 0, 0];

const ground_size = 100
const ground_divisions = 20

let objOffset = [0, 0, 0];
let viewMatrix, projectionMatrix;

let spiderYaw = 0;

window.onload = async function init() {
    const canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas, null);
    if (!gl) {
        alert("Failed to load WebGL");
        return;
    }

    const {viewMatrix: vm, projectionMatrix: pm} = initRenderer(gl, eye, at);
    viewMatrix = vm;
    projectionMatrix = pm;

    gl.clearColor(0.2, 0.2, 0.2, 1.0);

    try {
        const groundMesh = createGround(gl, ground_size, ground_divisions);
        const spiderRoot = await buildSpider(gl);
        const spiderLegs = spiderRoot.legs;

        // Assign defaultTargetOffset for each leg representing its initial local offset from the body
        spiderLegs.forEach(leg => {
            leg.defaultTargetOffset = leg.defaultTargetOffset || leg.attach.slice();
        });

        const sceneRoot = new SceneNode({name: "root"});
        const groundNode = new SceneNode({
            name: "ground",
            mesh: groundMesh,
        });
        const controller = new SceneNode({
            name: "controller",
            mesh: createBoxMesh(gl, [0.1, 0.1, 0.1]),
        })

        sceneRoot.addChild(groundNode);
        sceneRoot.addChild(spiderRoot);
        sceneRoot.addChild(controller);

        // Add foot debug markers
        spiderLegs.forEach((leg, index) => {
            const footMarker = new SceneNode({
                name: `leg${index}_footMarker`,
                mesh: createBoxMesh(gl, [0.1, 0.1, 0.1], [1, 0, 0]) // 빨간색으로 foot 위치 표시
            });
            const targetMarker = new SceneNode({
                name: `leg${index}_targetMarker`,
                mesh: createBoxMesh(gl, [0.1, 0.1, 0.1], [0, 1, 0]) // 초록색으로 target 위치 표시
            });
            sceneRoot.addChild(footMarker);
            sceneRoot.addChild(targetMarker);
            leg.footMarker = footMarker;
            leg.targetMarker = targetMarker;
            leg._debug = true;
        });

        canvas.addEventListener("mousemove", e => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const hit = raycast(gl, x, y, viewMatrix, projectionMatrix, groundMesh);
            if (hit) {
                objOffset = hit.position;
                document.getElementById('controllerX').textContent = hit.position[0].toFixed(2);
                document.getElementById('controllerY').textContent = hit.position[1].toFixed(2);
                document.getElementById('controllerZ').textContent = hit.position[2].toFixed(2);
            }
        });

        function update(time) {
            const [cx, cy, cz] = objOffset;
            const spiderPos = spiderRoot.getWorldPosition();
            const dx = cx - spiderPos[0];
            const dz = cz - spiderPos[2];
            const dist = Math.hypot(dx, dz);

            spiderLegs.forEach(leg => {
                leg.attachWorld = m4.transformPoint(spiderRoot.worldMatrix, leg.attach);
            });

            const gaitActive = gait.update(time, spiderLegs, spiderPos, objOffset, spiderYaw);

            if (gaitActive && dist > 0.05) {
                const speed = 0.02;
                const dir = [dx / dist, 0, dz / dist];
                const newPos = [
                    spiderPos[0] + dir[0] * speed,
                    1,
                    spiderPos[2] + dir[2] * speed
                ];

                // Smoothly turn spider toward controller direction
                const targetYaw = Math.atan2(dir[0], dir[2]);
                let deltaYaw = targetYaw - spiderYaw;

                // Clamp to [-π, π]
                deltaYaw = ((deltaYaw + Math.PI) % (2 * Math.PI)) - Math.PI;

                const maxTurn = 0.05; // max radians per frame
                const turn = Math.max(-maxTurn, Math.min(maxTurn, deltaYaw));
                spiderYaw += turn;

                spiderRoot.transforms.user = m4.multiply(m4.translation(...newPos), m4.yRotation(spiderYaw));

                document.getElementById('rotY').textContent = (spiderYaw).toFixed(2);
                document.getElementById('posX').textContent = newPos[0].toFixed(2);
                document.getElementById('posY').textContent = newPos[1].toFixed(2);
                document.getElementById('posZ').textContent = newPos[2].toFixed(2);
            }

            sceneRoot.traverse(node => node.updateLocalMatrix?.());
            sceneRoot.updateWorldMatrix();

            // Controller
            controller.transforms.user = m4.translation(cx, cy, cz);

            // Tripod gait and IK
            spiderLegs.forEach(leg => leg.update(time));
            
            // 로봇이 움직일 때만 FABRIK IK 시스템 적용
            if (gaitActive && dist > 0.05) {
                ik.solve(spiderRoot, spiderLegs);
            }
            
            // 테스트: 첫 번째 다리에 FABRIK 기반 원형 움직임 적용 (선택적)
            // ik.testLegMovementFabrik(spiderLegs[0], time);

            // Update foot debug markers
            spiderLegs.forEach((leg, index) => {
                if (!leg.footPosition || !leg.footTarget) {
                    console.warn(`Leg ${index}: missing position data`, {
                        footPosition: leg.footPosition,
                        footTarget: leg.footTarget
                    });
                    return;
                }

                const footPos = leg.footPosition;
                const targetPos = leg.footTarget;
                
                // 마커 업데이트 - transforms.user 사용
                if (leg.footMarker && leg.targetMarker) {
                    leg.footMarker.transforms.user = m4.translation(...footPos);
                    leg.targetMarker.transforms.user = m4.translation(...targetPos);
                } else {
                    console.warn(`Leg ${index}: missing markers`, {
                        footMarker: !!leg.footMarker,
                        targetMarker: !!leg.targetMarker
                    });
                }
            });

            // 마커 위치 업데이트 후 월드 매트릭스 다시 업데이트
            sceneRoot.traverse(node => node.updateLocalMatrix?.());
            sceneRoot.updateWorldMatrix();

            const debugPanel = document.getElementById("debugPanel");
            debugPanel.innerText = spiderLegs.map((leg, i) => {
                const markerPos = leg.footMarker?.transforms?.user ? 
                    [leg.footMarker.transforms.user[12], leg.footMarker.transforms.user[13], leg.footMarker.transforms.user[14]] : 
                    [0, 0, 0];
                
                // 조인트 각도 정보 추가
                const hipAngles = leg.hipJoint?.getAngles() || {x:0, y:.5, z:0};
                const kneeAngles = leg.kneeJoint?.getAngles() || {x:0, y:.5, z:0};
                const ankleAngles = leg.ankleJoint?.getAngles() || {x:0, y:.5, z:0};

                // const hipAngles = {x:0, y:.5, z:0};
                // const kneeAngles = {x:.5, y:.5, z:0};
                // const ankleAngles = {x:.5, y:.5, z:0};
                
                return `leg${i}: ${leg.isMoving ? "🟢" : "⚫️"} [${leg.phase || "unknown"}]
Foot: (${leg.footPosition.map(n => n.toFixed(2)).join(", ")})
Target: (${leg.footTarget.map(n => n.toFixed(2)).join(", ")})
Marker: (${markerPos.map(n => n.toFixed(2)).join(", ")})
Hip: (${(hipAngles.y * 180/Math.PI).toFixed(1)}°)
Knee: (${(kneeAngles.x * 180/Math.PI).toFixed(1)}°)
Ankle: (${(ankleAngles.x * 180/Math.PI).toFixed(1)}°)`;
            }).join("\n");
        }

        function loop(now) {
            const t = now * 0.001;
            update(t);
            renderScene(gl, sceneRoot);
            requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);
    } catch (error) {
        console.error("Failed to load .obj: ", error);
    }
};