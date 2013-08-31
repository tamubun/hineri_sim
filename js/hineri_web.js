'use strict';

var path = location.pathname.split("/");
path.pop();
path.push('js/physijs_worker.js');
Physijs.scripts.worker = path.join('/');
path.pop();
path.push('js/ammo.js');
Physijs.scripts.ammo = path.join('/');

var started, paused, count, controls, arm_constraints, jumptime,
    box_material, red_material, green_material, head_material,
    projector, renderer, scene, ground, wall, camera, bottom;

function initGlobal() {
  projector = new THREE.Projector;

  // Materials
  box_material = Physijs.createMaterial(new THREE.MeshLambertMaterial(
    {color:0x3300cc, overdraw: 0.5}));
  head_material = Physijs.createMaterial(new THREE.MeshLambertMaterial(
    {vertexColors: THREE.FaceColors, overdraw: 0.5}));
  red_material = Physijs.createMaterial(new THREE.MeshLambertMaterial(
    {color:0xff5500, overdraw: 0.5}));
  green_material = Physijs.createMaterial(new THREE.MeshLambertMaterial(
    {color:0x55ff00, overdraw: 0.5}));

  // Ground
  ground = new Physijs.BoxMesh(
    new THREE.CubeGeometry(100, 1, 100),
    Physijs.createMaterial(
      new THREE.MeshLambertMaterial({color:0x555555, overdraw: 0.5}),
        .8, // high friction
        .4  // low restitution
    ),
    0 // mass
  );
  ground.position.set(0, -50, 0);
  ground.receiveShadow = true;

  wall = new THREE.Mesh(
    new THREE.CubeGeometry(0.1, 300, 100),
    new THREE.MeshBasicMaterial(
      {color: 0x550000, transparent: true, opacity: 0.3}));
}

function init() {
  count = 0;
  paused = false;
  jumptime = -1000;

  var webgl = $('#gl').attr('checked') != null;
  if ( webgl ) {
    renderer = new THREE.WebGLRenderer();
    renderer.shadowMapEnabled = true;
  } else {
    renderer = new THREE.CanvasRenderer();
  }
  renderer.setSize(window.innerWidth*0.95, window.innerHeight*0.95);
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
  light = new THREE.AmbientLight(0x404040);
  scene.add(light);
  scene.add(ground);
  if ( $('#wall').attr('checked') != null )
    scene.add(wall);

  var box, boxes = [], constraint,
      haba = Number($('#haba').val()),
      okuyuki = Number($('#okuyuki').val()),
      takasa = 5, space = 1;

  for ( var i = 0; i < 5; i++ ) {
    var cube = new THREE.CubeGeometry(haba, takasa, okuyuki);
    if ( i === 4 ) {
      var c;
      for ( var j = 0; j < 12; ++j ) {
        switch (j) {
        case 4:
        case 5:
          c = 0x000000; break;
        case 10:
        case 11:
          c = ($('#front').attr('checked') != null)? 0xffff00: 0x000000; break;
        case 8:
        case 9:
          c = ($('#front').attr('checked') == null)? 0xffff00: 0x000000; break;
        default:
          c = 0x3300cc; break;
        }
        cube.faces[j].color.setHex(c);
      }
      box = new Physijs.BoxMesh(cube, head_material);
    } else {
      box = new Physijs.BoxMesh(cube, box_material);
    }
    box.position.set(0, -35+i*(takasa+space), -10);
    box.castShadow = true;
    if ( i === 3 && $('#arch').attr('checked') != null )
      box.position.z -= 0.1 * okuyuki;
    else if ( i === 4 && $('#arch').attr('checked') != null )
      box.position.z -= 0.35 * okuyuki;
    boxes.push(box);
    scene.add(box);

    if ( i === 0 )
      continue;

    constraint = new Physijs.HingeConstraint(
      box,
      boxes[i-1],
      new THREE.Vector3(0, box.position.y - 0.5*(takasa+space),-10),
      new THREE.Vector3(1, 0, 0)
    );
    scene.addConstraint(constraint);
    constraint = new Physijs.HingeConstraint(
      box,
      boxes[i-1],
      new THREE.Vector3(0, i*(takasa+1)-13, -10),
      new THREE.Vector3(0, 0, 1)
    );
    scene.addConstraint(constraint);
  }
  bottom = boxes[0];

  arm_constraints = [];
  if ( $('#arm').attr('checked') != null ) {
    for ( var i = 0; i < 2; ++i ) {
      box = new Physijs.BoxMesh(
        new THREE.CubeGeometry(0.2*haba, 1.8 * takasa, 0.2*haba),
        i === 0 ? red_material : green_material);
      box.position.set(
        boxes[3].position.x + (i === 0 ? 1 : -1) * 0.7 * haba,
        boxes[3].position.y + takasa,
        boxes[3].position.z);
      box.castShadow = true;
      scene.add(box);
      constraint = new Physijs.HingeConstraint(
        box,
        boxes[3],
        new THREE.Vector3(
          boxes[3].position.x + (i === 0 ? 1 : -1) * 0.65 * haba,
          boxes[3].position.y,
          boxes[3].position.z),
        new THREE.Vector3(0, 0, 1)
      );
      scene.addConstraint(constraint);
      constraint.enableAngularMotor(1000, (i === 0 ? 1 : -1) * 500);
      arm_constraints.push(constraint);
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
  if ( count <= jumptime || count >= jumptime + 23 )
    return;

  if ( $('#twist').attr('checked') == null ) {
    if ( $('#grav').attr('checked') != null ) {
      effect = new THREE.Vector3(0,1,0).multiplyScalar(2500);
      offset = new THREE.Vector3(0,0,0)
      bottom.applyImpulse(effect, offset);
    } else {
      effect = new THREE.Vector3(0,0,1).multiplyScalar(120);
      offset = new THREE.Vector3(0,-10,0)
      bottom.applyImpulse(effect, offset);
      bottom.applyImpulse(effect.negate(), offset.negate());
    }
  } else {
    if ( $('#grav').attr('checked') != null ) {
      effect = new THREE.Vector3(0,1,0).multiplyScalar(2500);
      offset = new THREE.Vector3(0,0,0)
      bottom.applyImpulse(effect, offset);
      effect = new THREE.Vector3(0,0,1).multiplyScalar(150);
      offset = new THREE.Vector3(1,0,0)
      bottom.applyImpulse(effect, offset);
      bottom.applyImpulse(effect.negate(), offset.negate());
    } else {
      effect = new THREE.Vector3(0,0,1).multiplyScalar(80);
      offset = new THREE.Vector3(0,-10,0)
      bottom.applyImpulse(effect, offset);
      effect = new THREE.Vector3(0,0,1).multiplyScalar(100);
      offset = new THREE.Vector3(1,0,0)
      bottom.applyImpulse(effect, offset);
      bottom.applyImpulse(effect.negate(), offset.negate());
    }
  }
  return;
};

$(function() {
  started = false;

  initGlobal();

  $('#startstop').click(function(){
    if ( !started ) {
      started = true;
      init();
      $(this).val('stop');
      $('#pause').removeAttr('disabled');
      $('#jump').removeAttr('disabled');
      $('#right').removeAttr('disabled');
      $('#controls input').attr('disabled', true);
      if ( $('#arm').attr('checked') == null )
        $('.arm').each(function() { $(this).attr('disabled', true); });
      else
        $('.arm').each(function() { $(this).removeAttr('disabled', true); });
    } else {
      started = false;
      controls.enabled = false;
      $('#startstop').val('start');
      $('#pause').attr('disabled', true).val('pause');
      $('#jump').attr('disabled', true);
      $('.arm').each(function() { $(this).attr('disabled', true); });
      $('#left-arm').val('緑腕↓');
      $('#red-arm').val('赤腕↓');
      $('#right').removeAttr('disabled');
      $('#viewport').children().remove();
      $('#controls input').removeAttr('disabled');
    }
  });

  $('#pause').click(function() {
    if ( paused ) {
      applyForce();
      scene.simulate(undefined, 1);
    }
    paused = !paused;
    $(this).val(paused ? 'resume' : 'pause');
  });

  $('#jump').click(function() {
    $(this).attr('disabled', true);
    jumptime = count + 10;
  });

  $('.arm').click(function() {
    var up = $(this).hasClass('up');
    $(this).toggleClass('up');
    $(this).val(
      ($(this).hasClass('green') ? '緑腕' : '赤腕') + (up ? '↑' :'↓'));
    if ( $(this).hasClass('green') ) {
      arm_constraints[1].enableAngularMotor(1000, (up ? 1 : -1) * 500);
    } else {
      arm_constraints[0].enableAngularMotor(1000, (up ? -1 : 1) * 500);
    }
  });
});
