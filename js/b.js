'use strict';
Physijs.scripts.worker = '../js/physijs_worker.js';
Physijs.scripts.ammo = '../js/ammo.js';

var started, count, controls, boxes,
    ground_material, box_material,
    projector, renderer, scene, ground, light, camera, center;

function initGlobal() {
  projector = new THREE.Projector;

  // Materials
  ground_material = Physijs.createMaterial(
    new THREE.MeshLambertMaterial(),
      .8, // high friction
      .4  // low restitution
  );

  box_material = Physijs.createMaterial(
    new THREE.MeshLambertMaterial({color:0x3300cc}));
}

function init() {
  var webgl = $('#gl').attr('checked') != null;
  if ( webgl ) {
    renderer = new THREE.WebGLRenderer();
    renderer.shadowMapEnabled = true;
  } else {
    renderer = new THREE.CanvasRenderer();
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  $('#viewport').append(renderer.domElement);

  scene = new Physijs.Scene;
  scene.setGravity(new THREE.Vector3(0, 0, 0));
  scene.addEventListener(
    'update',
    function() {
      if ( !started )
        return;
      applyForce();
      scene.simulate(undefined, 1);
    });
  camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    1,
    1000);
  camera.position.set(0, 0, 150);
  camera.lookAt(scene.position);
  scene.add(camera);

  controls = new THREE.TrackballControls(camera);
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;
  controls.noZoom = false;
  controls.noPan = false;
  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;

  // Light
  light = new THREE.DirectionalLight(0xFFFFFF);
  light.position.set(20, 40, 35);
  light.target.position.copy(scene.position);
  if ( webgl ) {
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
  }
  scene.add(light);

  count = 0;

  // Ground
  ground = new Physijs.BoxMesh(
    new THREE.CubeGeometry(100, 1, 100),
    ground_material,
    0 // mass
  );
  ground.position.set(0, -15, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  var box;
  boxes = [];
  for ( var i = 0; i < 5; i++ ) {
    box = new Physijs.BoxMesh(
      new THREE.CubeGeometry(
        Number($('#haba').val()), 5, Number($('#okuyuki').val())),
      box_material);
    box.position.set(0, i*6, 0);
    box.castShadow = true;
    scene.add(box);
    boxes.push(box);
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
  center = boxes[2];

  requestAnimationFrame(render);
  scene.simulate();
};

function render() {
  if ( !started )
    return;
  controls.update();
  requestAnimationFrame(render);
  renderer.render(scene, camera);
};

function applyForce() {
  if ( ++count > 20 ) {
    return;
  }
  var strength = 30, distance, effect, offset;

  effect =
    new THREE.Vector3(0,0,1).multiplyScalar(strength);
  offset = new THREE.Vector3(5,-18,-2)
  center.applyImpulse(effect, offset);
  center.applyImpulse(effect.negate(), offset.negate());
};

$(function() {
  started = false;

  initGlobal();

  $('#startstop').click(function(){
    if ( !started ) {
      started = true;
      init();
      $(this).attr('value', 'stop');
    } else {
      started = false;
      controls.enabled = false;
      $('#startstop').attr('value', 'start');
      $('#viewport').children().remove();
    }
  });
});
