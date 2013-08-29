'use strict';
Physijs.scripts.worker = '../js/physijs_worker.js';
Physijs.scripts.ammo = '../js/ammo.js';

var started, paused, count, controls, boxes,
    jumptime, hineritime,
    box_material,
    projector, renderer, scene, ground, wall, camera, bottom;

function initGlobal() {
  projector = new THREE.Projector;

  // Materials
  var ground_material = Physijs.createMaterial(
    new THREE.MeshLambertMaterial(),
      .8, // high friction
      .4  // low restitution
  );

  box_material = Physijs.createMaterial(new THREE.MeshLambertMaterial(
    {color:0x3300cc}));

  var wall_material = new THREE.MeshBasicMaterial(
    {color: 0x550000, transparent: true, opacity: 0.3});

  // Ground
  ground = new Physijs.BoxMesh(
    new THREE.CubeGeometry(100, 1, 100),
    ground_material,
    0 // mass
  );
  ground.position.set(0, -25, 0);
  ground.receiveShadow = true;

  var wall_geometry = new THREE.CubeGeometry(0.1, 300, 100);
  wall = new THREE.Mesh(wall_geometry, wall_material);
}

function init() {
  count = 0;
  paused = false;
  jumptime = -1000;
  hineritime = -1000;

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
  scene.setGravity(
    new THREE.Vector3(0, $('#grav').attr('checked') != null ? -30 : 0, 0));
  scene.addEventListener(
    'update',
    function() {
      if ( !started || paused )
        return;
      applyForce();
      scene.simulate(undefined, 1);
    });

  camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    1,
    1000);
  camera.position.set(0, 0, 250);
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
  var light = new THREE.DirectionalLight(0xFFFFFF);
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

  scene.add(ground);
  if ( $('#wall').attr('checked') != null )
    scene.add(wall);

  var box, constraint,
      haba = Number($('#haba').val()),
      okuyuki = Number($('#okuyuki').val()),
      takasa = 5;
  boxes = [];
  for ( var i = 0; i < 5; i++ ) {
    box = new Physijs.BoxMesh(
      new THREE.CubeGeometry(haba, takasa, okuyuki), box_material);
    box.position.set(0, -10+i*(takasa+1), 0);
    box.castShadow = true;
    if ( i == 3 && $('#arch').attr('checked') != null )
      box.position.z -= 0.1 * okuyuki;
    else if ( i == 4 && $('#arch').attr('checked') != null )
      box.position.z -= 0.35 * okuyuki;
    boxes.push(box);
    scene.add(box);

    if ( i == 0 )
      continue;

    constraint = new Physijs.HingeConstraint(
      box,
      boxes[i-1],
      new THREE.Vector3(0, i*(takasa+1)-13, 0),
      new THREE.Vector3(1, 0, 0)
    );
    scene.addConstraint(constraint);
    constraint = new Physijs.HingeConstraint(
      box,
      boxes[i-1],
      new THREE.Vector3(0, i*(takasa+1)-13, 0),
      new THREE.Vector3(0, 0, 1)
    );
    scene.addConstraint(constraint);
  }
  bottom = boxes[0];

  if ( $('#arm').attr('checked') != null ) {
    for ( var i = 0; i < 2; ++i ) {
      box = new Physijs.BoxMesh(
        new THREE.CubeGeometry(0.2*haba, 1.8 * takasa, 0.2*haba),
        box_material);
      box.position.set(
        boxes[3].position.x + (i == 0 ? 1 : -1) * 0.7 * haba,
        boxes[3].position.y + takasa,
        boxes[3].position.z);
      box.castShadow = true;
      scene.add(box);
      boxes.push(box);
      constraint = new Physijs.HingeConstraint(
        box,
        boxes[3],
        new THREE.Vector3(
          boxes[3].position.x + (i == 0 ? 1 : -1) * 0.65 * haba,
          boxes[3].position.y,
          boxes[3].position.z),
        new THREE.Vector3(0, 0, 1)
      );
      scene.addConstraint(constraint);
      constraint = new Physijs.HingeConstraint(
        box,
        boxes[3],
        new THREE.Vector3(
          boxes[3].position.x + (i == 0 ? 1 : -1) * 0.65 * haba,
          boxes[3].position.y,
          boxes[3].position.z),
        new THREE.Vector3(0, 1, 0)
      );
      scene.addConstraint(constraint);
    }
  }

  requestAnimationFrame(render);
  scene.simulate();
};

function render() {
  if ( !started )
    return;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
};

function applyForce() {
  var effect,
      offset;

  ++count;
  if ( count > jumptime && count < jumptime + 23 ) {
    if ( $('#grav').attr('checked') != null ) {
      effect = new THREE.Vector3(0,1,0).multiplyScalar(2500);
      offset = new THREE.Vector3(0,0,0)
      bottom.applyImpulse(effect, offset);
    } else {
      effect = new THREE.Vector3(0,0,1).multiplyScalar(80);
      offset = new THREE.Vector3(0,-10,0)
      bottom.applyImpulse(effect, offset);
      bottom.applyImpulse(effect.negate(), offset.negate());
    }
  } else if ( count > hineritime && count < hineritime + 23 ) {
    if ( $('#grav').attr('checked') != null ) {
      effect = new THREE.Vector3(0,1,0).multiplyScalar(2500);
      offset = new THREE.Vector3(0,0,0)
      bottom.applyImpulse(effect, offset);
      effect = new THREE.Vector3(0,0,1).multiplyScalar(100);
      offset = new THREE.Vector3(1,0,0)
      bottom.applyImpulse(effect, offset);
      bottom.applyImpulse(effect.negate(), offset.negate());
    } else {
      effect = new THREE.Vector3(0,0,1).multiplyScalar(80);
      offset = new THREE.Vector3(0,-10,0)
      bottom.applyImpulse(effect, offset);
      effect = new THREE.Vector3(0,0,1).multiplyScalar(80);
      offset = new THREE.Vector3(1,0,0)
      bottom.applyImpulse(effect, offset);
      bottom.applyImpulse(effect.negate(), offset.negate());
    }
  }
  return;

  if ( ++count > 20 ) {
    return;
  }

  offset = new THREE.Vector3(5,-18,-2)
  bottom.applyImpulse(effect, offset);
  bottom.applyImpulse(effect.negate(), offset.negate());
};

function doJump(notwist) {
  if ( notwist ) {
    jumptime = count + 30;
  } else {
    hineritime = count + 30;
  }
}

$(function() {
  started = false;

  initGlobal();

  $('#startstop').click(function(){
    if ( !started ) {
      started = true;
      init();
      $(this).attr('value', 'stop');
      $('#pause').removeAttr('disabled');
      $('#jump').removeAttr('disabled');
      $('#right').removeAttr('disabled');
      $('#controls input').attr('disabled', true);
      if ( $('#arm').attr('checked') == null )
        $('#drop').attr('disabled', true);
      else
        $('#drop').removeAttr('disabled');
    } else {
      started = false;
      controls.enabled = false;
      $('#startstop').attr('value', 'start');
      $('#pause').attr('disabled', true).attr('value', 'pause');
      $('#jump').attr('disabled', true);
      $('#right').removeAttr('disabled');
      $('#viewport').children().remove();
      $('body').off('keydown');
      $('#controls input').removeAttr('disabled');
    }
  });

  $('#pause').click(function() {
    if ( paused ) {
      applyForce();
      scene.simulate(undefined, 1);
    }
    paused = !paused;
    $(this).attr('value', paused ? 'resume' : 'pause');
  });

  $('#jump').click(function() {
    $(this).attr('disabled', true);
    doJump($('#twist').attr('checked') == null);
  });
});
