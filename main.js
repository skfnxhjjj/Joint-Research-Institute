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
        spiderLegs.forEach(leg => {
            const footMarker = new SceneNode({
                name: `${leg.name}_footMarker`,
                mesh: createBoxMesh(gl, [0.1, 0.1, 0.1])
            });
            const targetMarker = new SceneNode({
                name: `${leg.name}_targetMarker`,
                mesh: createBoxMesh(gl, [0.1, 0.1, 0.1])
            });
            spiderRoot.addChild(footMarker);
            spiderRoot.addChild(targetMarker);
            leg.footMarker = footMarker;
            leg.targetMarker = targetMarker;
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

            spiderLegs.forEach(leg => {
                leg.footTarget = m4.transformPoint(spiderRoot.worldMatrix, leg.defaultTargetOffset);
                leg.targetMarker.localMatrix = m4.translation(...leg.footTarget);
            });

            const gaitActive = gait.update(time, spiderLegs, spiderPos, objOffset);

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
            // ik.solve(spiderRoot, spiderLegs.map(leg => leg.footTarget));

            // Update foot debug markers
            spiderLegs.forEach(leg => {
                if (!leg._debug) return;
                const footPos = leg.footPosition;
                const targetPos = leg.footTarget;
                leg.footMarker.localMatrix = m4.translation(...footPos);
                leg.targetMarker.localMatrix = m4.translation(...targetPos);
            });

            const debugPanel = document.getElementById("debugPanel");
            debugPanel.innerText = spiderLegs.map((leg, i) =>
                `leg${i}: ${leg.isMoving ? "🟢" : "⚫️"}
                Foot: (${leg.footPosition.map(n => n.toFixed(2)).join(", ")})
                Target: (${leg.footTarget.map(n => n.toFixed(2)).join(", ")})`
            ).join("\n");
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