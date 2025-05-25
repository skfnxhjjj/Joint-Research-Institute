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
        // base * gait * ik * user 순서로 변경 (Joint와 동일하게)
        this.localMatrix = m4.multiply(
            this.transforms.base,
            m4.multiply(
                this.transforms.gait,
                m4.multiply(
                    this.transforms.ik,
                    this.transforms.user
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