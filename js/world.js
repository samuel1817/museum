import * as THREE from 'three';

export class QuestTerraceWorld {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this.exhibitGroup = new THREE.Group();
        this.scene.add(this.exhibitGroup);
        this.animatedMeshes = [];
        this.interactables = [];

        this.setupEnvironment('sunset');
        this.buildTerraceArchitecture();
        this.buildHorizonScenery();
    }

    setupEnvironment(mode) {
        const oldLights = this.scene.children.filter(c => c.isLight);
        oldLights.forEach(l => this.scene.remove(l));

        if (mode === 'night') {
            this.scene.background = new THREE.Color(0x0b1021);
            this.scene.fog = new THREE.FogExp2(0x0b1021, 0.014);
            const hemi = new THREE.HemisphereLight(0x6366f1, 0x1e1b4b, 0.85);
            const moon = new THREE.DirectionalLight(0x93c5fd, 1.2);
            moon.position.set(15, 25, -20);
            moon.castShadow = true;
            this.scene.add(hemi, moon);
        } else {
            this.scene.background = new THREE.Color(0xf4a261);
            this.scene.fog = new THREE.FogExp2(0xe76f51, 0.011);

            const hemi = new THREE.HemisphereLight(0xffddb3, 0x4a3b5c, 1.2);
            const sun = new THREE.DirectionalLight(0xff9e6d, 1.9);
            sun.position.set(-22, 16, -28);
            sun.castShadow = true;
            sun.shadow.mapSize.set(1024, 1024);
            this.scene.add(hemi, sun);
        }
    }

    buildTerraceArchitecture() {
        // Hlavná kruhová kamenná terasa
        const terraceGeo = new THREE.CylinderGeometry(22, 23, 0.6, 64);
        const terraceMat = new THREE.MeshStandardMaterial({ color: 0xd8cfc4, roughness: 0.65, metalness: 0.05 });
        const terrace = new THREE.Mesh(terraceGeo, terraceMat);
        terrace.position.y = -0.3;
        terrace.receiveShadow = true;
        this.scene.add(terrace);

        // Centrálny tkaný kruhový koberec (Meta Quest Home štýl)
        const rug = new THREE.Mesh(
            new THREE.CylinderGeometry(4.0, 4.0, 0.04, 48),
            new THREE.MeshStandardMaterial({ color: 0xb5838d, roughness: 0.92 })
        );
        rug.position.set(0, 0.02, 3);
        rug.receiveShadow = true;
        this.scene.add(rug);

        // Obvodový múrik terasy
        const rimGeo = new THREE.TorusGeometry(21.6, 0.35, 12, 64);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xede6dc, roughness: 0.5 });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.45;
        rim.receiveShadow = true;
        this.scene.add(rim);

        // Dekoratívne stĺpy okolo terasy (opravené súradnice)
        const pillarPositions = [
            [-14, -14],
            [14, -14],
            [-18, 4],
,
            [-10, -18],
            [10, -18]
        ];

        pillarPositions.forEach(([x, z]) => {
            const pillar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.45, 0.55, 5.2, 16),
                new THREE.MeshStandardMaterial({ color: 0xf5ebe0, roughness: 0.4 })
            );
            pillar.position.set(x, 2.6, z);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            this.scene.add(pillar);
            this.colliders.push(new THREE.Box3().setFromObject(pillar));
        });
    }

    buildHorizonScenery() {
        // Slnko na obzore
        const sunSphere = new THREE.Mesh(
            new THREE.SphereGeometry(5, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0xffe5b4, fog: false })
        );
        sunSphere.position.set(-45, 18, -75);
        this.scene.add(sunSphere);

        // Vzdialené skaly a hory v opare
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x7f556f, roughness: 0.9 });
        const mountains = [
            [-40, 14, -55, 16],
            [38, 18, -52, 20],
            [-55, 11, -15, 14],
            [52, 13, -10, 15],
            [0, 16, -68, 22]
        ];
        mountains.forEach(([x, h, z, r]) => {
            const m = new THREE.Mesh(new THREE.ConeGeometry(r, h * 2, 7), rockMat);
            m.position.set(x, h - 4, z);
            this.scene.add(m);
        });

        // Palmy pri okraji terasy (opravené súradnice)
        const palmCoords = [
            [-16, -11],
            [16, -11],
            [-19, 8],
            [19, 8]
        ];
        palmCoords.forEach(([x, z]) => this.createPalmTree(x, z));
    }

    createPalmTree(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.35, 6.5, 10),
            new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
        );
        trunk.position.y = 3.25;
        trunk.rotation.z = x > 0 ? -0.08 : 0.08;
        trunk.castShadow = true;
        group.add(trunk);

        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.6 });
        for (let i = 0; i < 6; i++) {
            const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3.2, 5), leafMat);
            leaf.position.set(x > 0 ? 0.25 : -0.25, 6.4, 0);
            leaf.rotation.z = Math.PI / 2.4;
            leaf.rotation.y = (i * Math.PI) / 3;
            leaf.castShadow = true;
            group.add(leaf);
        }
        this.scene.add(group);
    }

    renderExhibits(exhibitsList) {
        while (this.exhibitGroup.children.length > 0) {
            this.exhibitGroup.remove(this.exhibitGroup.children[0]);
        }
        this.animatedMeshes = [];
        this.interactables = [];

        const pedMat = new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.25, metalness: 0.5 });
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.05
        });

        exhibitsList.forEach((item, index) => {
            const angle = -Math.PI * 0.78 + (index * 0.31);
            const radius = 11.5;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            const holder = new THREE.Group();
            holder.position.set(x, 0, z);

            // Podstavec
            const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 1.1, 24), pedMat);
            pedestal.position.y = 0.55;
            pedestal.castShadow = true;
            pedestal.receiveShadow = true;
            holder.add(pedestal);

            // Sklenený kryt
            const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1.2, 24), glassMat);
            glass.position.y = 1.7;
            holder.add(glass);

            // 3D Artefakt
            let geo;
            switch (item.shape) {
                case 'torusKnot': geo = new THREE.TorusKnotGeometry(0.26, 0.08, 64, 16); break;
                case 'octahedron': geo = new THREE.OctahedronGeometry(0.36, 0); break;
                case 'icosahedron': geo = new THREE.IcosahedronGeometry(0.35, 0); break;
                case 'cone': geo = new THREE.ConeGeometry(0.3, 0.65, 5); break;
                default: geo = new THREE.DodecahedronGeometry(0.34, 0);
            }

            const mat = new THREE.MeshStandardMaterial({
                color: item.color, emissive: item.color, emissiveIntensity: 0.2, roughness: 0.2, metalness: 0.7
            });
            const art = new THREE.Mesh(geo, mat);
            art.position.y = 1.7;
            art.castShadow = true;
            holder.add(art);
            this.animatedMeshes.push(art);

            // Hitbox pre kliknutie/E
            const hit = new THREE.Mesh(
                new THREE.BoxGeometry(1.4, 2.4, 1.4),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            hit.position.y = 1.2;
            hit.userData = item;
            holder.add(hit);
            this.interactables.push(hit);

            this.exhibitGroup.add(holder);
        });
    }
}
