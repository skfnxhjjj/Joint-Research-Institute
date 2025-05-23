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
        this.transforms = {
            base: m4.identity(),
            gait: m4.identity(),
            ik: m4.identity(),
            user: m4.identity()
        };
    }
    
    addChild(node) {
        this.children.push(node);
    }

    updateLocalMatrix() {
        // Combine all transform components into the final localMatrix
        this.localMatrix = m4.multiply(
            this.transforms.user,
            m4.multiply(
                this.transforms.ik,
                m4.multiply(
                    this.transforms.gait,
                    this.transforms.base
                )
            )
        );
    }


    getWorldPosition() {
        const m = this.worldMatrix;
        return [m[12], m[13], m[14]];
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

    traverse(callback) {
        callback(this);
        for (const child of this.children) {
            if (typeof child.traverse === 'function') {
                child.traverse(callback);
            }
        }
    }
}