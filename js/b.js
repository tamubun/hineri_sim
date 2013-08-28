'use strict';
Physijs.scripts.worker = '../js/physijs_worker.js';
Physijs.scripts.ammo = '../js/ammo.js';
var initScene, render, applyForce, setMousePosition, mouse_position,
count,
ground_material, box_material,
projector, renderer, scene, ground, light, camera, box, boxes = [];
initScene = function() {
  projector = new THREE.Projector;
  renderer = new THREE.CanvasRenderer({ antialias: true });
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.shadowMapEnabled = true;
  renderer.shadowMapSoft = true;
  document.getElementById( 'viewport' ).appendChild( renderer.domElement );
  count = 0;

  scene = new Physijs.Scene;
  scene.setGravity(new THREE.Vector3( 0, 0, 0 ));
  scene.addEventListener(
    'update',
    function() {
      applyForce();
      scene.simulate( undefined, 1 );
    });
  camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    1,
    1000);
  camera.position.set( 60, 50, 150 );
  camera.lookAt( scene.position );
  scene.add( camera );

  // Light
  light = new THREE.DirectionalLight( 0xFFFFFF );
  light.position.set( 20, 40, -15 );
  light.target.position.copy( scene.position );
  light.castShadow = true;
  light.shadowCameraLeft = -60;
  light.shadowCameraTop = -60;
  light.shadowCameraRight = 60;
  light.shadowCameraBottom = 60;
  light.shadowCameraNear = 20;
  light.shadowCameraFar = 200;
  light.shadowBias = -.0001
  light.shadowMapWidth = light.shadowMapHeight = 2048;
  light.shadowDarkness = .7;
  scene.add( light );

  // Materials
  ground_material = Physijs.createMaterial(
    new THREE.MeshLambertMaterial(),
      .8, // high friction
      .4 // low restitution
  );

  box_material = Physijs.createMaterial(
    new THREE.MeshLambertMaterial({color:0x3300cc}),
      .4, // low friction
      .6 // high restitution
  );

  // Ground
  ground = new Physijs.BoxMesh(
    new THREE.CubeGeometry(100, 1, 100),
    ground_material,
    0 // mass
  );
  ground.position.set(
    0,
      -10,
    0);
  ground.receiveShadow = true;
  //  scene.add( ground );

  for ( var i = 0; i < 4; i++ ) {
    box = new Physijs.BoxMesh(
      new THREE.CubeGeometry( 7, 5, 4 ),
      box_material);
    box.position.set(
      0,
      0+i*6,
      0);
    box.castShadow = true;
    scene.add( box );
    boxes.push( box );
    if ( i == 0 )
      continue;

    var constraint = new Physijs.HingeConstraint(
      box,
      boxes[i-1],
      new THREE.Vector3(0, i*6-3, 0),
      new THREE.Vector3(1, 0, 0)
    );
    scene.addConstraint(constraint);
    constraint = new Physijs.HingeConstraint(
      box,
      boxes[i-1],
      new THREE.Vector3(0, i*6-3, 0),
      new THREE.Vector3(0, 0, 1)
    );
    scene.addConstraint(constraint);
  }

  renderer.domElement.addEventListener( 'mousemove', setMousePosition );

  requestAnimationFrame( render );
  scene.simulate();
};

render = function() {
  requestAnimationFrame( render );
  renderer.render( scene, camera );
};

setMousePosition = function( evt ) {
  // Find where mouse cursor intersects the ground plane
  var vector = new THREE.Vector3(
    ( evt.clientX / renderer.domElement.clientWidth ) * 2 - 1,
      -( ( evt.clientY / renderer.domElement.clientHeight ) * 2 - 1 ),
      .5);
  projector.unprojectVector( vector, camera );
  vector.sub( camera.position ).normalize();

  var coefficient = (box.position.y - camera.position.y) / vector.y
  mouse_position =
    camera.position.clone().add( vector.multiplyScalar( coefficient ) );
};

applyForce = function() {
  if ( ++count > 20 ) {
    return;
  }
  var strength = 30, distance, effect, offset, box;

  box = boxes[0];
  effect =
    new THREE.Vector3(0,0,1).multiplyScalar( strength ).negate(),
  offset = new THREE.Vector3(5,-18,-2)
  box.applyImpulse( effect, offset );
};

window.onload = initScene;
