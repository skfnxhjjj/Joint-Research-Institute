export class SceneNode {
    constructor({
                    name,
                    mesh = null,
                    localMatrix = m4.identity(),
                    children = []
                }) {
        this.name = name;
        this.mesh = mesh;
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

    traverse(callback) {
        callback(this);
        for (const child of this.children) {
            if (typeof child.traverse === 'function') {
                child.traverse(callback);
            }
        }
    }
}