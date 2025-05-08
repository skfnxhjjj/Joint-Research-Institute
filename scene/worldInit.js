export function createGround(gl) {
    const size = 0;
    const positions = [
        -size, 0, -size,
        size, 0, -size,
        -size, 0, size,
        size, 0, -size,
        size, 0, size,
        -size, 0, size,
    ];

    const colors = [
        0.6, 0.6, 0.6,
        0.6, 0.6, 0.6,
        0.6, 0.6, 0.6,
        0.6, 0.6, 0.6,
        0.6, 0.6, 0.6,
        0.6, 0.6, 0.6,
    ];

    const buffer = (data) => {
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        return b;
    };

    return {
        numElements: 6,
        buffers: {
            position: buffer(positions),
            color: buffer(colors),
            normal: buffer([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
            texcoord: null
        },
        transform: [1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1]
    };
}