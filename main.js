"use strict";

import { loadOBJ } from "./utils/modelLoader.js";
import { initRenderer, renderScene } from "./scene/renderer.js";

var gl;
var cameraPosition = [100, 100, 100];
var cameraTarget = [0, 0, 0];

var objOffset = [0, 0, 0];

window.onload = async function init() {
    const canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL 로드 실패");
        return;
    }

    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    initRenderer(gl, program, cameraPosition, cameraTarget);

    gl.clearColor(0.2, 0.2, 0.2, 1.0);

    try {
        const meshes = await loadOBJ(gl, "./assets/models/spider.obj");

        function animationLoop(now) {
            const timeInSeconds = now * 0.001;
            renderScene(gl, meshes, timeInSeconds, objOffset);
            requestAnimationFrame(animationLoop);
        }
        requestAnimationFrame(animationLoop);
    } catch (error) {
        console.error("OBJ 파일을 로드 에러 : ", error);
    }
};