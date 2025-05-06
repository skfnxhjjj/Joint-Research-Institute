import { parseOBJ } from "../common/objParser.js";

function createBuffer(gl, data) {
    if (!data || data.length === 0) return null;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return buffer;
}

export async function loadOBJ(gl, url) {
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
                position: createBuffer(gl, data.position),
                normal: createBuffer(gl, data.normal),
                texcoord: createBuffer(gl, data.texcoord),
                color: createBuffer(gl, colors),
            },
        };
    });
}