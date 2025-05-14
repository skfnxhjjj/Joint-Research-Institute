"use strict";

import { loadOBJ } from "./utils/modelLoader.js";
import { initRenderer, renderScene } from "./scene/renderer.js";
import { createGround } from "./scene/worldInit.js";
import { raycast } from "./utils/raycast.js";

let gl;
// let m4;
let m4 = window.m4;
const eye = [10, 10, 10];
const at = [0, 0, 0];

const ground_size = 100
const ground_divisions = 20

let objOffset = [0, 0, 0];
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
        const ground = createGround(gl, ground_size, ground_divisions);
        const spider = await loadOBJ(gl, "./assets/models/spider.obj");
        spider.forEach(mesh => {
            mesh.name = 'spider';
        });

        const scene = {
            meshes: [],
            addMesh(mesh) {
                this.meshes.push(mesh);
            }
        };

        scene.addMesh(ground);
        spider.forEach(mesh => scene.addMesh(mesh));

        canvas.addEventListener("mousemove", e => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const hit = raycast(gl, x, y, viewMatrix, projectionMatrix, ground);
            if (hit) {
                objOffset = hit.position;
                document.getElementById('controllerX').textContent = hit.position[0].toFixed(2);
                document.getElementById('controllerY').textContent = hit.position[1].toFixed(2);
                document.getElementById('controllerZ').textContent = hit.position[2].toFixed(2);
            }
        });

        function render() {
            const [cx, cy, cz] = objOffset

            const angleY = Math.atan2(cx, cz) - Math.PI / 2;
            spider.forEach(mesh => {
                mesh.transform = m4.multiply(
                    m4.yRotation(angleY),
                    m4.scaling(0.05, 0.05, 0.05)
                );
            });
            renderScene(gl, scene);
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
    } catch (error) {
        console.error("Failed to load .obj: ", error);
    }
};