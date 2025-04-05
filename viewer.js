import * as THREE from 'three';
import WebGL from "three/addons/capabilities/WebGL";
import {FontLoader, GLTFLoader, PointerLockControls, TextGeometry} from "three/addons";

// Constants
const INTERACTION_THRESHOLD = 3;
const SOLUTION = [
	{ x: -40, z: -15 },
	{ x: -40, z: 10 },
	{ x: -40, z: 35 },
	{ x: -15, z: 35 },
	{ x: 10, z: 10 },
	{ x: 35, z: -40 },
	{ x: 35, z: -15 },
	{ x: 35, z: 10 }
];

// Global variables
let buttons = [];
let lightsSource = [];
let ambiantLight = getAmbiantLight();
let hiddenText;
let specialLight = false;
const scene =  new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 0.1, 1000 );
const controls = new PointerLockControls(camera, document.body);
const audioListener = new THREE.AudioListener();
const sound = new THREE.Audio( audioListener );
const audioLoader = new THREE.AudioLoader();
const renderer = new THREE.WebGLRenderer({ antialias: true });
const whiteConcreteMaterial = getWhiteConcreteMaterial();
const grayConcreteMaterial = getGrayConcreteMaterial();
const keys = {
	z: false, // forward
	q: false, // left
	s: false, // backward
	d: false  // right
};

initGame();

function initGame() {
	// init keys listener
	listenKeys();

	// Setting camera
	camera.position.set(0,2,0);
	camera.lookAt(0,2,0);

	// Attach pointer movement
	controls.pointerSpeed = 1.5;
	scene.add(controls.getObject());
	listenCameraLock();

	// add AudioListener to the camera
	camera.add( audioListener );

	// Setting renderer
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	createScene();
}

function createScene() {
	scene.add(getFloor());
	scene.add(getRoof());
	addInteruptor(scene);
	scene.add(ambiantLight);
	addHiddenText(scene);
	addVisibleText(scene);
	addDoor(scene);

	for (let x = -40; x < 40; x+=25) {
		for (let z = -40; z < 40; z+=25) {
			addLight(x, z, scene);
			addButton(x, z, scene);
		}
	}

	const leftWall = getWall();
	leftWall.rotateY(Math.PI / 2);
	leftWall.position.set(-50, 0, 0);
	scene.add(leftWall);

	const rightWall = getWall();
	rightWall.rotateY(-Math.PI / 2);
	rightWall.position.set(50, 0, 0);
	scene.add(rightWall);

	const backWall = getWall();
	backWall.rotateY(Math.PI);
	backWall.position.set(0, 0, 50);
	scene.add(backWall);

	const frontWall = getWall();
	frontWall.rotateY(-Math.PI / 99999999);
	frontWall.position.set(0, 0, -50);
	scene.add(frontWall);
}

function animate()
{
	requestAnimationFrame( animate );
	displayInteractMessage();

	const moveSpeed = 0.15; // Adjust to suit your needs

	if (keys.z) controls.moveForward(moveSpeed);
	if (keys.s) controls.moveForward(-moveSpeed);
	if (keys.q) controls.moveRight(-moveSpeed);
	if (keys.d) controls.moveRight(moveSpeed);

	camera.position.setX(Math.max(-49, Math.min(49, camera.position.x)));
	camera.position.setZ(Math.max(-49, Math.min(49, camera.position.z)));

	renderer.render(scene, camera);
}

if ( WebGL.isWebGLAvailable() )
{
	// Initiate function or other initializations here
	animate();
} else
{
	const warning = WebGL.getWebGLErrorMessage();
	document.getElementById( 'container' ).appendChild( warning );
}

function listenKeys() {
	document.addEventListener('keydown', (event) => {
		switch (event.key.toLowerCase()) {
			case 'z': keys.z = true; break;
			case 'q': keys.q = true; break;
			case 's': keys.s = true; break;
			case 'd': keys.d = true; break;
		}
		if (event.code === 'KeyE') {
			// Check for any buttons within the interaction threshold.
			tryInteractWithButton();
		}
		if (event.code === 'KeyL') {
			toggleLightMode();
		}
	});

	document.addEventListener('keyup', (event) => {
		switch (event.key.toLowerCase()) {
			case 'z': keys.z = false; break;
			case 'q': keys.q = false; break;
			case 's': keys.s = false; break;
			case 'd': keys.d = false; break;
		}
	});
}

function listenCameraLock() {
	document.addEventListener('click', () => {
		controls.lock();
	});
}

function getWhiteConcreteMaterial() {
	const textureLoader = new THREE.TextureLoader();

	// Load each texture
	const colorTexture = textureLoader.load('assets/concrete_white/color.jpg');
	const roughnessTexture = textureLoader.load('assets/concrete_white/roughness.jpg');
	const normalTextureGL = textureLoader.load('assets/concrete_white/normalGL.jpg');
	const displacementTexture = textureLoader.load('assets/concrete_white/displacement.jpg');

	// Set wrapping mode and repeat for each texture
	[colorTexture, roughnessTexture, normalTextureGL, displacementTexture].forEach(tex => {
		tex.wrapS = THREE.RepeatWrapping;
		tex.wrapT = THREE.RepeatWrapping;
		tex.repeat.set(25, 25); // Adjust these numbers as needed
	});

	return new THREE.MeshStandardMaterial({
		map: colorTexture,
		roughnessMap: roughnessTexture,
		normalMap: normalTextureGL,
		displacementMap: displacementTexture,
		displacementScale: 0.1
	});
}

function getGrayConcreteMaterial() {
	// Create a TextureLoader instance
	const textureLoader = new THREE.TextureLoader();

	// Load each texture
	const colorTexture = textureLoader.load('assets/concrete_gray/color.jpg');
	const roughnessTexture = textureLoader.load('assets/concrete_gray/roughness.jpg');
	const normalTextureGL = textureLoader.load('assets/concrete_gray/normalGL.jpg');
	const displacementTexture = textureLoader.load('assets/concrete_gray/displacement.jpg');

	// Set wrapping mode and repeat for each texture
	[colorTexture, roughnessTexture, normalTextureGL, displacementTexture].forEach(tex => {
		tex.wrapS = THREE.RepeatWrapping;
		tex.wrapT = THREE.RepeatWrapping;
		tex.repeat.set(30, 2);
	});

	return new THREE.MeshStandardMaterial({
		map: colorTexture,
		roughnessMap: roughnessTexture,
		normalMap: normalTextureGL,
		displacementMap: displacementTexture,
		displacementScale: 0.1
	});
}

function getAmbiantLight() {
	return new THREE.AmbientLight(0xffffff, 0.5);
}

function getFloor() {
	const geometry = new THREE.PlaneGeometry(100, 100, 10, 10); // high segments for displacement
	geometry.rotateX(-Math.PI / 2); // rotate to be flat
	return new THREE.Mesh(geometry, whiteConcreteMaterial);
}

function getWall() {
	const geometry = new THREE.PlaneGeometry(100, 10, 10, 10); // high segments for displacement
	geometry.translate(0, 5, 0);
	return new THREE.Mesh(geometry, grayConcreteMaterial);
}

function getRoof() {
	const geometry = new THREE.PlaneGeometry(100, 100, 10, 10); // high segments for displacement
	geometry.rotateX(-Math.PI / 2); // rotate to be flat
	geometry.rotateZ(Math.PI); // rotate to be upside down
	geometry.translate(0, 10, 0);
	return new THREE.Mesh(geometry, whiteConcreteMaterial);
}

function addInteruptor(scene) {
	const loader = new GLTFLoader();
	loader.load( 'assets/interruptor.glb', function ( gltf ) {
		gltf.scene.scale.set(4, 4, 4);
		gltf.scene.position.set(49.925, 2, 0);
		gltf.scene.rotateY(-Math.PI / 2);
		scene.add( gltf.scene );
	}, undefined, function ( error ) {
		console.error( error );
	});
}

function addLight(x, z, scene) {
	const loader = new GLTFLoader();
	loader.load( 'assets/ceiling_light.glb', function ( gltf ) {
		const light = gltf.scene;
		light.position.set(x, 9.9, z);
		scene.add(light);
	}, undefined, function ( error ) {
		console.error( error );
	});

	const rectLight = new THREE.RectAreaLight( 0xffffff, 20,  2, 2 );
	rectLight.position.set( x, 9.9, z );
	rectLight.lookAt( x, 0, z );
	lightsSource.push(rectLight);
	scene.add( rectLight )
}

function addDoor(scene) {
	const loader = new GLTFLoader();
	loader.load( 'assets/door.glb', function ( gltf ) {
		const door = gltf.scene;
		door.position.set(-49.9, 2.5, 0);
		door.scale.set(0.025, 0.025, 0.025);
		scene.add(door);
	}, undefined, function ( error ) {
		console.error( error );
	});
}

function addButton(x, z, scene) {
	const loader = new GLTFLoader();
	loader.load( 'assets/button_round_flat.glb', function ( gltf ) {
		const button = gltf.scene;
		button.position.set(x, 0.05, z);
		button.pushed = false;
		scene.add(button);
		buttons.push(button);
	}, undefined, function ( error ) {
		console.error( error );
	});
}

function addHiddenText(scene) {
	const loader = new FontLoader();

	loader.load( 'assets/Roading Night_Regular.json', function ( font ) {

		const geometry = new TextGeometry( 'O O O X\nX O O X\nX O X X\nX X O O', {
			font: font,
			size: 1,
			depth: 0.1,
		} );
		geometry.translate(0, 5, -49.99);

		const material = new THREE.MeshBasicMaterial( { color: 0x03fcb6 } );
		hiddenText = new THREE.Mesh( geometry, material );
		hiddenText.visible = false;

		scene.add( hiddenText );
	} );
}

function addVisibleText(scene) {
	const loader = new FontLoader();

	loader.load( 'assets/Roading Night_Regular.json', function ( font ) {

		const geometry = new TextGeometry( 'Key = L', {
			font: font,
			size: 0.4,
			depth: 0.1,
		} );

		const material = new THREE.MeshBasicMaterial( { color: 0x222222 } );
		const text = new THREE.Mesh( geometry, material );
		text.position.set(-49.99, 3, 0.75);
		text.rotateY(Math.PI / 2);

		scene.add(text);
	} );
}



function playEndGame() {
	for (const source of lightsSource) {
		source.color.set(0x00ff00);
	}

	setTimeout(() => {
		audioLoader.load( 'assets/end_game.mp3', function( buffer ) {
			sound.setBuffer(buffer);
			sound.setLoop(false);
			sound.setVolume(1);
			sound.play();

			setTimeout(() => {
				window.location.href = 'end.html';
			}, 4000);
		});
	}, 2000);
}

function tryInteractWithButton() {
	buttons.forEach((button) => {
		const distance = camera.position.distanceTo(button.position);
		if (distance < INTERACTION_THRESHOLD) {
			interactWithButton(button);
		}
	});
}

function interactWithButton(button) {
	audioLoader.load( 'assets/push_btn.mp3', function( buffer ) {
		sound.setBuffer(buffer);
		sound.setLoop(false);
		sound.setVolume(1);
		sound.play();
	});

	toggleButton(button);
	if (isPuzzleResolved()) {
		playEndGame();
	}
}

function toggleButton(button) {
	button.traverse((child) => {
		if (child.isMesh && child.name === "Button_Cyrcle_1_Button_Button_Cyrcle_1_0") {
			if (button.pushed) {
				child.position.setY(0);
			} else {
				child.position.setY(-15);
			}
		}
	});
	for (const source of lightsSource) {
		if (source.position.x === button.position.x && source.position.z === button.position.z) {
			if (button.pushed) {
				source.color.set(0xffffff);
			} else {
				source.color.set(0xff0000);
			}
			break;
		}
	}
	button.pushed = !button.pushed;
}

function toggleLightMode() {
	specialLight = !specialLight;

	if (!specialLight) {
		ambiantLight.color.set(0xffffff);
		ambiantLight.intensity = 0.5;
		hiddenText.visible = false;
	} else {
		ambiantLight.color.set(0x4400ff);
		ambiantLight.intensity = 2;
		hiddenText.visible = true;
	}
}

function isPuzzleResolved() {
	for (const button of buttons) {
		let shouldBePushed = false;
		for (const solution of SOLUTION) {
			if (button.position.x === solution.x && button.position.z === solution.z) {
				shouldBePushed = true;
				break;
			}
		}

		if (button.pushed !== shouldBePushed) {
			return false;
		}
	}
	return true;
}

function displayInteractMessage() {
	let display = false;
	buttons.forEach((button) => {
		const distance = camera.position.distanceTo(button.position);
		if (distance < INTERACTION_THRESHOLD) {
			display = true;
		}
	});

	if (display) {
		document.getElementById('interact').style.display = 'block';
	} else {
		document.getElementById('interact').style.display = 'none';
	}
}