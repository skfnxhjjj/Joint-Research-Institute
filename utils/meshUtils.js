import { loadOBJ } from "./modelLoader.js";

export function createBoxMesh(gl, size, color = [0.7, 0.7, 0.7, 1.0]) {
    const x = size[0], y = size[1], z = size[2];

    const hx = x / 2, hz = z / 2;

    // Vertices (y from 0 to y, x/z centered)
    const positions = [
        // Front face
        -hx, 0, hz, hx, 0, hz, hx, y, hz, -hx, y, hz,
        // Back face
        -hx, 0, -hz, -hx, y, -hz, hx, y, -hz, hx, 0, -hz,
        // Top face
        -hx, y, -hz, -hx, y, hz, hx, y, hz, hx, y, -hz,
        // Bottom face
        -hx, 0, -hz, hx, 0, -hz, hx, 0, hz, -hx, 0, hz,
        // Right face
        hx, 0, -hz, hx, y, -hz, hx, y, hz, hx, 0, hz,
        // Left face
        -hx, 0, -hz, -hx, 0, hz, -hx, y, hz, -hx, y, -hz,
    ];

    const normals = [
        // Each face repeated 4 times
        ...Array(4).fill([0, 0, 1]).flat(),
        ...Array(4).fill([0, 0, -1]).flat(),
        ...Array(4).fill([0, 1, 0]).flat(),
        ...Array(4).fill([0, -1, 0]).flat(),
        ...Array(4).fill([1, 0, 0]).flat(),
        ...Array(4).fill([-1, 0, 0]).flat()
    ];

    const indices = [
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        8, 9, 10, 8, 10, 11,
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19,
        20, 21, 22, 20, 22, 23
    ];

    const p = [], n = [], c = [];
    const finalColor = color.length === 3 ? [...color, 1.0] : color;

    for (let i = 0; i < indices.length; i++) {
        const vi = indices[i];
        p.push(...positions.slice(vi * 3, vi * 3 + 3));
        n.push(...normals.slice(vi * 3, vi * 3 + 3));
        c.push(...finalColor);
    }

    function makeBuffer(data, num) {
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        buf.numComponents = num;
        return buf;
    }

    return {
        numElements: indices.length,
        buffers: {
            position: makeBuffer(p, 3),
            normal: makeBuffer(n, 3),
            color: makeBuffer(c, 4)
        }
    };
}

export async function loadMesh(gl, meshConfig) {
    if (!meshConfig || meshConfig.type === "box") {
        return createBoxMesh(gl, meshConfig?.size || [1, 1, 1]);
    }
    if (meshConfig.type === "obj") {
        return await loadOBJ(gl, meshConfig.path);
    }
    throw new Error(`Unsupported mesh type: ${meshConfig.type}`);
}