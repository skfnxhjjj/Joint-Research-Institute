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
let currentSpiderPosition = [0, 1, 0]; // 현재 거미 위치 저장
let prevSpiderPosition = [0, 1, 0]; // 이전 거미 위치 저장
let currentYaw = 0; // 현재 회전 각도 저장
let viewMatrix, projectionMatrix;

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

        const sceneRoot = new SceneNode({name: "root"});
        const groundNode = new SceneNode({
            name: "ground",
            mesh: groundMesh,
            pivot: [0, 0, 0],
            localMatrix: m4.identity()
        });
        const controller = new SceneNode({
            name: "controller",
            mesh: createBoxMesh(gl, [0.1, 0.1, 0.1]),
            pivot: [0, 0, 0],
            localMatrix: m4.identity()
        })

        sceneRoot.addChild(groundNode);
        sceneRoot.addChild(spiderRoot);
        sceneRoot.addChild(controller);

        console.log(sceneRoot);

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
            // Controller target position
            const [cx, cy, cz] = objOffset;
            
            // Calculate spider height (body height above ground)
            const spiderHeight = 1.0;
            
            // Target position for spider (controller's position with proper height)
            const targetPosition = [cx, spiderHeight, cz];
            
            // Calculate distance to target
            const distanceToTarget = Math.sqrt(
                Math.pow(targetPosition[0] - currentSpiderPosition[0], 2) +
                Math.pow(targetPosition[2] - currentSpiderPosition[2], 2)
            );
            
            // Move spider gradually towards target
            const moveSpeed = 0.005; // 이동 속도 조절 (0~1, 작을수록 느림)
            const stopThreshold = 0.1; // 이 거리 이하에서는 이동 중지 (미세한 떨림 방지)
            
            if (distanceToTarget > stopThreshold) {
                // 각 축별로 보간하여 부드러운 이동
                currentSpiderPosition[0] += (targetPosition[0] - currentSpiderPosition[0]) * moveSpeed;
                currentSpiderPosition[1] = spiderHeight; // Y는 고정
                currentSpiderPosition[2] += (targetPosition[2] - currentSpiderPosition[2]) * moveSpeed;
            }
            
            // Calculate movement direction for yaw rotation
            const deltaX = currentSpiderPosition[0] - prevSpiderPosition[0];
            const deltaZ = currentSpiderPosition[2] - prevSpiderPosition[2];
            const movementMagnitude = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
            
            if (movementMagnitude > 0.01) { // 최소 이동 거리 임계값
                // 이동 방향으로 회전 (목표 각도)
                const targetYaw = Math.atan2(deltaX, deltaZ);
                
                // 부드러운 회전을 위한 보간 (lerp)
                const rotationSpeed = 0.1; // 회전 속도 조절 (0~1)
                let yawDiff = targetYaw - currentYaw;
                
                // 각도 차이를 -π ~ π 범위로 정규화
                while (yawDiff > Math.PI) yawDiff -= 2 * Math.PI;
                while (yawDiff < -Math.PI) yawDiff += 2 * Math.PI;
                
                currentYaw += yawDiff * rotationSpeed;
            }
            
            spiderRoot.localMatrix = m4.multiply(
                m4.translation(...currentSpiderPosition),
                m4.yRotation(currentYaw),
                m4.scaling(config.scale, config.scale, config.scale),
            );

            // 현재 위치를 다음 프레임을 위해 저장
            prevSpiderPosition = [...currentSpiderPosition];

            // Controller position (on ground) - 목표점 표시
            controller.localMatrix = m4.translation(cx, 0, cz);

            // Tripod gait and IK
            const footTargets = gait.calculate(time);
            ik.solve(spiderRoot, footTargets);

            // Update the scene graph
            sceneRoot.updateWorldMatrix();
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