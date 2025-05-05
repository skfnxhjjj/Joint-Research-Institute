"use strict";

import { parseOBJ } from "./objParser.js";

var gl;
var meshProgramInfo;
var cameraPosition = [0, 5, 10];
var cameraTarget = [0, 0, 0];
var zNear = 0.1;
var zFar = 1000;
var objOffset = [0, 0, 0];

function createBuffer(data) {
  if (!data || data.length === 0) return null;
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  return buffer;
}

async function loadOBJ(url) {
  const response = await fetch(url);
  const text = await response.text();
  const obj = parseOBJ(text);

  return obj.geometries.map(({ data }) => {
    let colors = data.color;
    if (!colors || colors.length !== data.position.length) {
      colors = new Array(data.position.length).fill(1);
    }

    return {
      numElements: data.position.length / 3,
      buffers: {
        position: createBuffer(data.position),
        normal: createBuffer(data.normal),
        texcoord: createBuffer(data.texcoord),
        color: createBuffer(colors),
      },
    };
  });
}

function degToRad(d) {
  return (d * Math.PI) / 180;
}

function bindAttrib(buffer, attrib, size) {
  if (buffer && attrib >= 0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(attrib, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attrib);
  }
}

window.onload = async function init() {
  const canvas = document.getElementById("gl-canvas");
  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL로드 실패");
    return;
  }

  const program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  meshProgramInfo = {
    program: program,
    attribLocations: {
      a_position: gl.getAttribLocation(program, "vPosition"),
      a_normal: gl.getAttribLocation(program, "vNormal"),
      a_texcoord: gl.getAttribLocation(program, "vTexCoord"),
      a_color: gl.getAttribLocation(program, "vColor"),
    },
    uniformLocations: {
      u_world: gl.getUniformLocation(program, "uWorld"),
      u_view: gl.getUniformLocation(program, "uView"),
      u_projection: gl.getUniformLocation(program, "uProjection"),
      u_lightDirection: gl.getUniformLocation(program, "uLightDirection"),
      u_diffuse: gl.getUniformLocation(program, "uDiffuse"),
    },
  };

  gl.clearColor(0.2, 0.2, 0.2, 1.0);

  try {
    const meshes = await loadOBJ("/src/box.obj");
    render(meshes);
  } catch (error) {
    console.error("OBJ 파일을 로드 에러 : ", error);
  }
};

function render(meshes) {
  let then = 0;

  function renderFrame(now) {
    now *= 0.001;
    then = now;

    const canvas = gl.canvas;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const up = [0, 1, 0];
    const cameraMatrix = m4.lookAt(cameraPosition, cameraTarget, up);
    const viewMatrix = m4.inverse(cameraMatrix);

    gl.useProgram(meshProgramInfo.program);

    gl.uniformMatrix4fv(meshProgramInfo.uniformLocations.u_projection, false, projectionMatrix);
    gl.uniformMatrix4fv(meshProgramInfo.uniformLocations.u_view, false, viewMatrix);
    gl.uniform3fv(meshProgramInfo.uniformLocations.u_lightDirection, m4.normalize([-1, 3, 5]));
    gl.uniform4fv(meshProgramInfo.uniformLocations.u_diffuse, [1, 1, 1, 1]);

    const worldMatrix = m4.yRotation(now * 0.5);
    const translatedWorld = m4.translate(worldMatrix, ...objOffset);
    gl.uniformMatrix4fv(meshProgramInfo.uniformLocations.u_world, false, translatedWorld);

    gl.enable(gl.DEPTH_TEST);

    for (const mesh of meshes) {
      bindAttrib(mesh.buffers.position, meshProgramInfo.attribLocations.a_position, 3);
      bindAttrib(mesh.buffers.normal, meshProgramInfo.attribLocations.a_normal, 3);
      bindAttrib(mesh.buffers.texcoord, meshProgramInfo.attribLocations.a_texcoord, 2);
      bindAttrib(mesh.buffers.color, meshProgramInfo.attribLocations.a_color, 3);

      gl.drawArrays(gl.TRIANGLES, 0, mesh.numElements);
    }

    requestAnimFrame(renderFrame);
  }

  requestAnimFrame(renderFrame);
}
