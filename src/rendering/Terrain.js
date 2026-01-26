
export class Terrain {
    constructor(size, resolution) {
        this.size = size;
        this.resolution = resolution;
        this.mesh = null;
        this.heightData = [];
    }

    generate(assetManager) {
        const geometry = new THREE.PlaneGeometry(this.size, this.size, this.resolution, this.resolution);
        const vertices = geometry.attributes.position.array;
        const colors = [];
        const color = new THREE.Color();
        
        this.heightData = new Float32Array((this.resolution + 1) * (this.resolution + 1));

        for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
            const x = vertices[i];
            const y = vertices[i + 1];
            
            // Rumore per il terreno (coerente con getHeight)
            const height = this.calculateHeight(x, y);
            
            vertices[i + 2] = height;
            this.heightData[j] = height;

            // Colore basato sull'altezza
            if (height > 250) color.setHex(0xffffff);
            else if (height > 120) color.setHex(0x7d5c3d);
            else if (height > 20) color.setHex(0x3a7d32);
            else if (height > -10) color.setHex(0xc2b280);
            else color.setHex(0x4d3319);
            
            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.8,
            metalness: 0.1
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.receiveShadow = true;
        
        return this.mesh;
    }

    calculateHeight(x, y) {
        const nx = x / 1000;
        const ny = y / 1000;
        return Math.sin(nx) * Math.cos(ny) * 300 + 
               Math.sin(nx * 2) * 100 + 
               Math.cos(ny * 2.5) * 50;
    }

    getHeight(x, z) {
        // Ritorna l'altezza calcolata direttamente (più veloce di raycasting per terreni procedurali semplici)
        // Usiamo y invece di z perché in PlaneGeometry la coordinata verticale originale è y
        return this.calculateHeight(x, z);
    }
}

