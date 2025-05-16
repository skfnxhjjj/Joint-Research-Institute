export class SceneNode {
    constructor({
                    name,
                    mesh = null,
                    material = null,
                    pivot = [0, 0, 0],
                    localMatrix = m4.identity(),
                    children = []
                }) {
        this.name = name;
        this.mesh = mesh;
        this.material = material;
        this.pivot = pivot;
        this.localMatrix = localMatrix;
        this.worldMatrix = m4.identity();
        this.children = children;
    }

    addChild(node) {
        this.children.push(node);
    }

    updateWorldMatrix(parentWorldMatrix = m4.identity()) {
        const t1 = m4.translation(...this.pivot);
        const t2 = m4.translation(-this.pivot[0], -this.pivot[1], -this.pivot[2]);
        const localWithPivot = m4.multiply(
            m4.multiply(t1, this.localMatrix),
            t2
        );

        this.worldMatrix = m4.multiply(parentWorldMatrix, localWithPivot);

        for (const child of this.children) {
            child.updateWorldMatrix(this.worldMatrix);
        }
    }
}