import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';

gsap.registerPlugin(ScrollTrigger);

// --- CONFIGURAÇÃO DA CENA ---
const canvas = document.querySelector('#rubik-canvas');
const container = document.querySelector('.canvas-container');

const scene = new THREE.Scene();
scene.background = null; 

const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(7, 6, 9);

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.enablePan = false;
controls.enableZoom = false; // Desativa o conflito com o scroll do mouse
controls.minDistance = 4;
controls.maxDistance = 25;

// --- PÓS PROCESSAMENTO ---
const size = renderer.getDrawingBufferSize(new THREE.Vector2());
const renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, {
    samples: 4 
});
const composer = new EffectComposer(renderer, renderTarget);
const renderPass = new RenderPass(scene, camera);
renderPass.clearColor = new THREE.Color(0x000000);
renderPass.clearAlpha = 0;
composer.addPass(renderPass);

const fxaaPass = new ShaderPass(FXAAShader);
const pixelRatio = renderer.getPixelRatio();
fxaaPass.material.uniforms['resolution'].value.set(
    1 / (container.clientWidth * pixelRatio), 
    1 / (container.clientHeight * pixelRatio)
);
composer.addPass(fxaaPass);

const filmPass = new FilmPass(0.3, 0.0, 0, true);
composer.addPass(filmPass);

// --- GEOMETRIA E MATERIAIS ---
const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

const cubeColors = {
    U: 0xFFFFFF, D: 0xFFD500, F: 0x00FF00, 
    B: 0x0000FF, L: 0xFF8800, R: 0xFF0000
};
const cubeSize = 0.88;
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize); 

// Inverted Hull technique for thick black cartoon outlines
const outlineSize = 0.98;
const outlineGeometry = new THREE.BoxGeometry(outlineSize, outlineSize, outlineSize);
const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide });

// Custom Shader for Halftone Comics Effect
function createCartoonMaterial(colorHex) {
    if (colorHex === 0x0A0A0A) { // Preto interno não tem shader
        return new THREE.MeshBasicMaterial({ color: colorHex });
    }
    
    return new THREE.ShaderMaterial({
        uniforms: {
            baseColor: { value: new THREE.Color(colorHex) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 baseColor;
            varying vec2 vUv;
            void main() {
                // Rotaciona UV em 45 graus para os pontinhos ficarem diagonais
                vec2 centered = vUv - 0.5;
                float c = 0.7071; // cos(45)
                float s = 0.7071; // sin(45)
                vec2 ruv = vec2(centered.x * c - centered.y * s, centered.x * s + centered.y * c);
                
                // Cria a grade de halftone (22 linhas)
                vec2 grid = fract(ruv * 22.0);
                float dist = distance(grid, vec2(0.5));
                
                // Desenha o círculo com borda suave (anti-aliasing)
                float dot = 1.0 - smoothstep(0.15, 0.25, dist);
                
                // Mistura a cor base com o preto do halftone (40% de opacidade)
                vec3 finalColor = mix(baseColor, vec3(0.0), dot * 0.4);
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `
    });
}

const cubes = []; 
for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
            const baseColor = 0x0A0A0A; // Preto absoluto interno
            const materials = [
                createCartoonMaterial(x === 1 ? cubeColors.R : baseColor),
                createCartoonMaterial(x === -1 ? cubeColors.L : baseColor),
                createCartoonMaterial(y === 1 ? cubeColors.U : baseColor),
                createCartoonMaterial(y === -1 ? cubeColors.D : baseColor),
                createCartoonMaterial(z === 1 ? cubeColors.F : baseColor),
                createCartoonMaterial(z === -1 ? cubeColors.B : baseColor) 
            ];
            const cubie = new THREE.Mesh(geometry, materials);
            cubie.position.set(x, y, z);
            
            // Adiciona a borda grossa (Inverted Hull)
            const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
            cubie.add(outline);
            
            cubie.userData = { id: `${x},${y},${z}` };
            cubeGroup.add(cubie);
            cubes.push(cubie);
        }
    }
}

// --- DICIONÁRIO DE NOTAÇÕES ---
const notationMap = {
    "U":  { axis: 'y', target: 1,  direction: -1 },
    "U'": { axis: 'y', target: 1,  direction: 1 },
    "D":  { axis: 'y', target: -1, direction: 1 },
    "D'": { axis: 'y', target: -1, direction: -1 },
    "L":  { axis: 'x', target: -1, direction: 1 },
    "L'": { axis: 'x', target: -1, direction: -1 },
    "R":  { axis: 'x', target: 1,  direction: -1 },
    "R'": { axis: 'x', target: 1,  direction: 1 },
    "F":  { axis: 'z', target: 1,  direction: -1 },
    "F'": { axis: 'z', target: 1,  direction: 1 },
    "B":  { axis: 'z', target: -1, direction: 1 },
    "B'": { axis: 'z', target: -1, direction: -1 },
    // Camadas do meio (Middle, Equator, Standing)
    "M":  { axis: 'x', target: 0,  direction: 1 },
    "M'": { axis: 'x', target: 0,  direction: -1 },
    "E":  { axis: 'y', target: 0,  direction: 1 },
    "E'": { axis: 'y', target: 0,  direction: -1 },
    "S":  { axis: 'z', target: 0,  direction: -1 },
    "S'": { axis: 'z', target: 0,  direction: 1 }
};

// Obter a notação contrária para o resolver
function invertNotation(note) {
    return note.includes("'") ? note.replace("'", "") : note + "'";
}

// Transformar dados crus em uma notação se possível
function getNotationFromRaw(axis, target, direction) {
    // Corrige problema de precisão flutuante (ex: 0.99999 em vez de 1)
    const roundedTarget = Math.round(target);
    for (const [note, data] of Object.entries(notationMap)) {
        if (data.axis === axis && data.target === roundedTarget && data.direction === direction) {
            return note;
        }
    }
    return null;
}

// --- FILA DE ROTAÇÃO E HISTÓRICO ---
const activePivot = new THREE.Group();
scene.add(activePivot);

let isAnimating = false;
const moveQueue = [];
const moveHistory = []; 

function executeNextMove() {
    if (isAnimating || moveQueue.length === 0) return;
    
    isAnimating = true;
    const move = moveQueue.shift(); // Tira o primeiro da fila
    
    const slicePieces = cubes.filter(c => Math.abs(c.position[move.axis] - move.target) < 0.1);
    
    activePivot.rotation.set(0,0,0);
    slicePieces.forEach(c => activePivot.attach(c));
    
    const angle = -(Math.PI / 2) * move.direction;
    
    gsap.to(activePivot.rotation, {
        [move.axis]: angle,
        duration: 0.35, // Tempo maior para o bounce acontecer
        ease: "back.out(1.7)", // Interação Bouncy de desenho animado (Pop & Snap)
        onComplete: () => {
            activePivot.updateMatrixWorld();
            slicePieces.forEach(c => {
                cubeGroup.attach(c);
                c.position.x = Math.round(c.position.x);
                c.position.y = Math.round(c.position.y);
                c.position.z = Math.round(c.position.z);
                
                const euler = new THREE.Euler().setFromQuaternion(c.quaternion);
                euler.x = Math.round(euler.x / (Math.PI/2)) * (Math.PI/2);
                euler.y = Math.round(euler.y / (Math.PI/2)) * (Math.PI/2);
                euler.z = Math.round(euler.z / (Math.PI/2)) * (Math.PI/2);
                c.quaternion.setFromEuler(euler);
            });
            
            isAnimating = false;
            executeNextMove(); // Chama o próximo recursivamente
        }
    });
}

function enqueueMoveRaw(axis, target, direction, duration = 0.25, isSolvingAction = false) {
    moveQueue.push({ axis, target, direction, duration, isSolvingAction });
    
    // Gravar no histórico de forma síncrona na Fila, não no fim da animação, 
    // assim o Botão Resolver sabe do futuro mesmo que a animação não tenha acabado.
    if (!isSolvingAction) {
        const note = getNotationFromRaw(axis, target, direction);
        if (note) moveHistory.push(note);
    }
    
    executeNextMove();
}

function enqueueNotation(notation, duration = 0.25, isSolvingAction = false) {
    const data = notationMap[notation];
    if (data) {
        enqueueMoveRaw(data.axis, data.target, data.direction, duration, isSolvingAction);
    }
}

// --- BOTÕES DA INTERFACE ---
document.querySelectorAll('.notation-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const move = btn.getAttribute('data-move');
        enqueueNotation(move);
    });
});

document.getElementById('btn-scramble').addEventListener('click', scrambleCube);
document.getElementById('btn-solve').addEventListener('click', solveCube);

function scrambleCube() {
    const notationsList = Object.keys(notationMap);
    for (let i = 0; i < 20; i++) {
        const randomNote = notationsList[Math.floor(Math.random() * notationsList.length)];
        // Duração 0.05 para ser super rápido e seco
        enqueueNotation(randomNote, 0.05); 
    }
}

function solveCube() {
    if(moveHistory.length === 0) return;
    // Pega o histórico, inverte a ordem, inverte as rotações e joga na fila
    const reverseMoves = [...moveHistory].reverse().map(invertNotation);
    reverseMoves.forEach(note => {
        enqueueNotation(note, 0.08, true); // true = não gravar no histórico de novo
    });
    // Limpar histórico real após colocar tudo na queue
    moveHistory.length = 0; 
}

// Atalhos de Teclado
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 's') scrambleCube();
    if (e.key.toLowerCase() === 'r') solveCube();
});

// Botões de Algoritmos (Seção 2)
document.querySelectorAll('.btn-algo').forEach(btn => {
    btn.addEventListener('click', () => {
        const algo = btn.getAttribute('data-algo');
        const moves = algo.split(' ');
        moves.forEach(note => {
            if(note.includes('2')) {
                // Injeta 2 movimentos na fila
                const baseNote = note.replace('2', '');
                enqueueNotation(baseNote, 0.1);
                enqueueNotation(baseNote, 0.1);
            } else {
                enqueueNotation(note, 0.1);
            }
        });
    });
});

// Botão Reboot (Seção 4)
document.getElementById('btn-reboot')?.addEventListener('click', () => {
    window.location.reload();
});

// --- SCROLLTRIGGER (CÂMERA ORBITAL) ---
const scrollTl = gsap.timeline({
    scrollTrigger: {
        trigger: ".scroll-content",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5, // Suavidade na resposta do scroll
    }
});

// Ao rolar, a câmera passeia em volta do cubo
// 7 seções full-width com posições de câmera variadas
scrollTl.to(camera.position, { x: -6, y: 5, z: 14, ease: "none" })  // Invenção
        .to(camera.position, { x: 5, y: -2, z: 12, ease: "none" })   // Anatomia
        .to(camera.position, { x: -4, y: 4, z: 15, ease: "none" })   // Febre
        .to(camera.position, { x: 3, y: -3, z: 20, ease: "none" })   // Loucura (longe, texto central)
        .to(camera.position, { x: 6, y: 2, z: 13, ease: "none" })    // Speedcubing
        .to(camera.position, { x: 0, y: 0, z: 22, ease: "none" });   // Footer (longe)

// Timeline separada: Move o CONTAINER do cubo horizontalmente
// para que ele não sobreponha o texto
const cubeOffsetTl = gsap.timeline({
    scrollTrigger: {
        trigger: ".scroll-content",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5,
    }
});

// Posição inicial: Hero tem texto na ESQUERDA, então cubo vai pra DIREITA
gsap.set('.canvas-container', { xPercent: 35 });

cubeOffsetTl
    .to('.canvas-container', { xPercent: -35, ease: "none" })  // Invenção: texto RIGHT → cubo LEFT
    .to('.canvas-container', { xPercent: 35, ease: "none" })   // Anatomia: texto LEFT → cubo RIGHT
    .to('.canvas-container', { xPercent: 35, ease: "none" })   // Febre: texto LEFT → cubo RIGHT
    .to('.canvas-container', { xPercent: 0, ease: "none" })    // Loucura: texto CENTER → cubo CENTER (longe)
    .to('.canvas-container', { xPercent: 35, ease: "none" })   // Speed: texto LEFT → cubo RIGHT
    .to('.canvas-container', { xPercent: 0, ease: "none" });   // Footer: cubo CENTER (longe)

// --- GSAP MOTION DESIGN (FULL-WIDTH SECTIONS) ---

// 1. Títulos: Entram deslizando de baixo com bounce
gsap.utils.toArray('.section-title').forEach(title => {
    gsap.from(title, {
        scrollTrigger: {
            trigger: title,
            start: "top 85%",
            toggleActions: "play none none reverse"
        },
        y: 80,
        opacity: 0,
        duration: 0.8,
        ease: "back.out(1.5)"
    });
});

// 2. Textos: Entram com fade suave
gsap.utils.toArray('.section-text').forEach(text => {
    gsap.from(text, {
        scrollTrigger: {
            trigger: text,
            start: "top 90%",
            toggleActions: "play none none reverse"
        },
        y: 40,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        delay: 0.2
    });
});

// 3. Botões: Entram com pop elástico
gsap.utils.toArray('.comic-btn').forEach(btn => {
    gsap.from(btn, {
        scrollTrigger: {
            trigger: btn,
            start: "top 92%",
            toggleActions: "play none none reverse"
        },
        scale: 0,
        rotation: gsap.utils.random(-10, 10),
        duration: 0.5,
        ease: "back.out(2)",
        delay: 0.3
    });
});

// 4. Sparkles: Pulso orgânico infinito com gsap.utils.random
document.querySelectorAll('.sparkle').forEach(el => {
    gsap.to(el, {
        rotation: () => gsap.utils.random(-30, 30),
        scale: () => gsap.utils.random(0.6, 1.5),
        duration: () => gsap.utils.random(1.5, 3),
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        repeatRefresh: true
    });
});

// 5. Fun-badges: Entram deslizando da esquerda
gsap.utils.toArray('.fun-badge').forEach(badge => {
    gsap.from(badge, {
        scrollTrigger: {
            trigger: badge,
            start: "top 88%",
            toggleActions: "play none none reverse"
        },
        x: -60,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out"
    });
});

// 6. Big Numbers: Efeito de "slam" (aparece grande e encolhe)
gsap.utils.toArray('.big-number').forEach(num => {
    gsap.from(num, {
        scrollTrigger: {
            trigger: num,
            start: "top 85%",
            toggleActions: "play none none reverse"
        },
        scale: 2.5,
        opacity: 0,
        duration: 0.6,
        ease: "back.out(1.2)"
    });
});


// --- LÓGICA DE INTERAÇÃO (RAYCAST & DRAG) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let dragStartPoint = null;
let dragIntersectNormal = null;
let clickedCubie = null;
const dragPlane = new THREE.Plane();
const dragPlaneIntersect = new THREE.Vector3();

window.addEventListener('pointerdown', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(cubes, false);
    const hit = (intersects.length > 0 && intersects[0].face) ? intersects[0] : null;
    
    if (hit) {
        controls.enabled = false; 
        clickedCubie = hit.object;
        dragIntersectNormal = hit.face.normal.clone().transformDirection(clickedCubie.matrixWorld).round();
        dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), hit.point);
        dragStartPoint = hit.point.clone();
    }
});

window.addEventListener('pointermove', (e) => {
    if (!dragStartPoint) return;
    
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const didIntersect = raycaster.ray.intersectPlane(dragPlane, dragPlaneIntersect);
    if (!didIntersect) return;

    const dragVector = new THREE.Vector3().subVectors(dragPlaneIntersect, dragStartPoint);
    
    if (dragVector.length() > 0.5) {
        let axis = new THREE.Vector3();
        if (Math.abs(dragIntersectNormal.x) > 0.5) dragVector.x = 0;
        if (Math.abs(dragIntersectNormal.y) > 0.5) dragVector.y = 0;
        if (Math.abs(dragIntersectNormal.z) > 0.5) dragVector.z = 0;
        
        let absX = Math.abs(dragVector.x);
        let absY = Math.abs(dragVector.y);
        let absZ = Math.abs(dragVector.z);
        let maxDrag = Math.max(absX, absY, absZ);
        
        let sliceTarget = 0;
        let rotationAxis = 'x';
        let direction = 1;

        if (Math.abs(dragIntersectNormal.z) > 0.5) { 
            if (maxDrag === absX) { rotationAxis = 'y'; sliceTarget = clickedCubie.position.y; direction = Math.sign(dragVector.x) * Math.sign(dragIntersectNormal.z) * -1; }
            else { rotationAxis = 'x'; sliceTarget = clickedCubie.position.x; direction = Math.sign(dragVector.y) * Math.sign(dragIntersectNormal.z); }
        } else if (Math.abs(dragIntersectNormal.x) > 0.5) { 
            if (maxDrag === absZ) { rotationAxis = 'y'; sliceTarget = clickedCubie.position.y; direction = Math.sign(dragVector.z) * Math.sign(dragIntersectNormal.x); }
            else { rotationAxis = 'z'; sliceTarget = clickedCubie.position.z; direction = Math.sign(dragVector.y) * Math.sign(dragIntersectNormal.x) * -1; }
        } else { 
            if (maxDrag === absX) { rotationAxis = 'z'; sliceTarget = clickedCubie.position.z; direction = Math.sign(dragVector.x) * Math.sign(dragIntersectNormal.y); }
            else { rotationAxis = 'x'; sliceTarget = clickedCubie.position.x; direction = Math.sign(dragVector.z) * Math.sign(dragIntersectNormal.y) * -1; }
        }

        // Envia para a fila ao invés de rodar direto
        enqueueMoveRaw(rotationAxis, sliceTarget, direction);
        
        dragStartPoint = null; 
    }
});

window.addEventListener('pointerup', () => {
    controls.enabled = true;
    dragStartPoint = null;
    clickedCubie = null;
    dragIntersectNormal = null;
});


// --- LOOP DE ANIMAÇÃO ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    composer.render();
}

// --- RESPONSIVIDADE ---
window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    renderTarget.setSize(size.width, size.height);
    if(fxaaPass) {
        fxaaPass.material.uniforms['resolution'].value.set(
            1 / (w * renderer.getPixelRatio()), 
            1 / (h * renderer.getPixelRatio())
        );
    }
});

// --- INTRO SEQUENCE (PAPEL RASGANDO) ---
function playIntroAnimation() {
    const wrap = document.getElementById('intro-wrap');
    const cover = document.getElementById('intro-cover');
    
    // Travar scroll do body
    document.body.style.overflow = 'hidden';
    
    // Clonar a capa para criar as duas metades
    const leftHalf = cover.cloneNode(true);
    const rightHalf = cover.cloneNode(true);
    
    // Remover o original e adicionar as metades
    wrap.innerHTML = '';
    wrap.appendChild(leftHalf);
    wrap.appendChild(rightHalf);
    
    // Aplicar clip-path de serrote/rasgo
    // Metade Esquerda: recorta tudo à direita do zigue-zague
    leftHalf.style.clipPath = "polygon(0 0, 50% 0, 45% 10%, 55% 20%, 45% 30%, 55% 40%, 45% 50%, 55% 60%, 45% 70%, 55% 80%, 45% 90%, 50% 100%, 0 100%)";
    // Metade Direita: recorta tudo à esquerda do zigue-zague
    rightHalf.style.clipPath = "polygon(100% 0, 50% 0, 45% 10%, 55% 20%, 45% 30%, 55% 40%, 45% 50%, 55% 60%, 45% 70%, 55% 80%, 45% 90%, 50% 100%, 100% 100%)";
    
    // Adicionar um pouco de sombra na borda do rasgo direita para dar profundidade de papel rasgado (opcional via filter, mas vamos usar rotação 3D)
    
    const tl = gsap.timeline({
        onComplete: () => {
            // Liberar scroll e deletar o wrapper
            document.body.style.overflow = 'auto';
            wrap.remove();
            
            // Refrescar o ScrollTrigger porque o overflow hidden pode ter bugado as posições
            ScrollTrigger.refresh();
        }
    });
    
    // 1. Pausa inicial para o usuário apreciar a capa (2.5 segundos)
    tl.to({}, { duration: 2.5 });
    
    // 2. O Rasgo! (As metades voam para os lados rodando levemente)
    tl.to(leftHalf, {
        xPercent: -120,
        rotation: -15,
        duration: 1.2,
        ease: "power4.inOut"
    }, "tear")
    .to(rightHalf, {
        xPercent: 120,
        rotation: 15,
        duration: 1.2,
        ease: "power4.inOut"
    }, "tear");
    
    // 3. A câmera do cubo dá um salto para trás acompanhando o rasgo
    gsap.from(camera.position, {
        z: 5, // Começa bem perto da tela, dentro do buraco da capa
        duration: 1.5,
        ease: "back.out(1)",
        delay: 2.7
    });
}

// Iniciar
animate();
playIntroAnimation();
