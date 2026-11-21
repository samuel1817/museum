import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { QuestTerraceWorld } from './world.js';

const DEFAULT_EXHIBITS = [
    { id: 'def-1', title: 'Solárny astroláb', author: 'Kurátor múzea', shape: 'torusKnot', color: '#f4a261', description: 'Staroveký navigačný prístroj merajúci výšku slnka nad obzorom.' },
    { id: 'def-2', title: 'Kryštál z hlbín', author: 'Geologická zbierka', shape: 'octahedron', color: '#00b4d8', description: 'Vzácny priesvitný minerál vytvorený pod extrémnym tlakom.' },
    { id: 'def-3', title: 'Sférický chronometer', author: 'Astronomický ústav', shape: 'icosahedron', color: '#a855f7', description: 'Model nebeskej sféry používaný na výpočet pohybu planét.' }
];

class QuestMuseumTest {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 150);
        this.camera.position.set(0, 1.7, 5);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.world = new QuestTerraceWorld(this.scene);
        this.controls = new PointerLockControls(this.camera, document.body);
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 4.5;

        this.keys = { w: false, a: false, s: false, d: false, shift: false };
        this.hoveredExhibit = null;
        this.isPlaying = false;

        this.loadExhibits();
        this.bindUI();
        this.bindControls();

        this.clock = new THREE.Clock();
        window.addEventListener('resize', () => this.onResize());
        this.animate();
    }

    loadExhibits() {
        const custom = JSON.parse(localStorage.getItem('quest_local_exhibits') || '[]');
        this.allExhibits = [...DEFAULT_EXHIBITS, ...custom];
        this.world.renderExhibits(this.allExhibits);
        this.renderExhibitsList();
    }

    bindUI() {
        const questUI = document.getElementById('quest-ui');
        const hud = document.getElementById('hud');
        const inspectModal = document.getElementById('inspect-modal');

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.onclick = () => this.switchTab(btn.dataset.tab);
        });

        const enter3D = () => {
            questUI.classList.add('hidden');
            inspectModal.classList.add('hidden');
            hud.classList.remove('hidden');
            this.isPlaying = true;
            try {
                this.controls.lock();
            } catch (e) {
                console.warn('PointerLock nepodporovaný, pokračujem v režime voľnej kamery.');
            }
        };

        document.getElementById('btn-enter-vr').onclick = enter3D;
        document.getElementById('dock-play').onclick = enter3D;
        document.getElementById('btn-close-inspect').onclick = enter3D;

        document.getElementById('dock-add').onclick = () => this.switchTab('tab-create');
        document.getElementById('dock-list').onclick = () => this.switchTab('tab-exhibits');
        document.getElementById('dock-settings').onclick = () => this.switchTab('tab-settings');

        document.querySelectorAll('.zone-card').forEach(card => {
            card.onclick = () => {
                const coords = card.dataset.pos.split(',').map(Number);
                this.camera.position.set(...coords);
                enter3D();
            };
        });

        document.getElementById('create-form').onsubmit = (e) => {
            e.preventDefault();
            const custom = JSON.parse(localStorage.getItem('quest_local_exhibits') || '[]');
            custom.push({
                id: 'cust-' + Date.now(),
                title: document.getElementById('in-title').value,
                author: document.getElementById('in-author').value || 'Návštevník',
                shape: document.getElementById('in-shape').value,
                color: document.getElementById('in-color').value,
                description: document.getElementById('in-desc').value
            });
            localStorage.setItem('quest_local_exhibits', JSON.stringify(custom));
            e.target.reset();
            this.loadExhibits();
            this.switchTab('tab-exhibits');
        };

        document.getElementById('opt-time').onchange = (e) => this.world.setupEnvironment(e.target.value);
        document.getElementById('opt-shadows').onchange = (e) => {
            this.renderer.shadowMap.enabled = e.target.value === 'on';
        };
        document.getElementById('btn-clear-custom').onclick = () => {
            localStorage.removeItem('quest_local_exhibits');
            this.loadExhibits();
        };

        this.controls.addEventListener('unlock', () => {
            this.isPlaying = false;
            if (inspectModal.classList.contains('hidden')) {
                hud.classList.add('hidden');
                questUI.classList.remove('hidden');
            }
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === tabId));
    }

    renderExhibitsList() {
        const container = document.getElementById('exhibits-list');
        container.innerHTML = this.allExhibits.map(ex => `
            <div class="ex-row">
                <div>
                    <strong>${ex.title}</strong>
                    <div style="font-size:0.8rem;color:#94a3b8">Autor: ${ex.author}</div>
                </div>
                <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${ex.color}"></span>
            </div>
        `).join('');
    }

    bindControls() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.w = true;
            if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.s = true;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.a = true;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.d = true;
            if (e.code === 'ShiftLeft') this.keys.shift = true;
            if (e.code === 'KeyE' && this.isPlaying && this.hoveredExhibit) {
                this.openInspect(this.hoveredExhibit);
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.w = false;
            if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.s = false;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.a = false;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.d = false;
            if (e.code === 'ShiftLeft') this.keys.shift = false;
        });

        document.addEventListener('click', () => {
            if (this.controls.isLocked && this.hoveredExhibit) {
                this.openInspect(this.hoveredExhibit);
            }
        });
    }

    openInspect(data) {
        this.isPlaying = false;
        this.controls.unlock();
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('ins-author').textContent = `Autor: ${data.author}`;
        document.getElementById('ins-title').textContent = data.title;
        document.getElementById('ins-desc').textContent = data.description;
        document.getElementById('inspect-modal').classList.remove('hidden');
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = Math.min(this.clock.getDelta(), 0.1);

        this.world.animatedMeshes.forEach(m => { m.rotation.y += delta * 0.7; });

        if (this.controls.isLocked || this.isPlaying) {
            const speed = this.keys.shift ? 9.0 : 4.8;
            if (this.keys.w) this.controls.moveForward(speed * delta);
            if (this.keys.s) this.controls.moveForward(-speed * delta);
            if (this.keys.d) this.controls.moveRight(speed * delta);
            if (this.keys.a) this.controls.moveRight(-speed * delta);

            const dist = Math.hypot(this.camera.position.x, this.camera.position.z);
            if (dist > 20) {
                const angle = Math.atan2(this.camera.position.z, this.camera.position.x);
                this.camera.position.x = Math.cos(angle) * 20;
                this.camera.position.z = Math.sin(angle) * 20;
            }

            this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
            const hits = this.raycaster.intersectObjects(this.world.interactables, false);
            const prompt = document.getElementById('prompt');

            if (hits.length > 0) {
                this.hoveredExhibit = hits[0].object.userData;
                prompt.classList.remove('hidden');
            } else {
                this.hoveredExhibit = null;
                prompt.classList.add('hidden');
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new QuestMuseumTest();
});
