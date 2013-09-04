'use strict';

var path = location.pathname.split("/");
path.pop();
path.push('js/physijs_worker.js');
Physijs.scripts.worker = path.join('/');
path.pop();
path.push('js/ammo.js');
Physijs.scripts.ammo = path.join('/');

var started, paused, count, controls, arm_constraints, jumptime,
    boxes, constraints,
    box_material, red_material, green_material, head_material, head_material2,
    renderer, gl_rend, canvas_rend, scene, ground, wall, camera, bottom;

function initGlobal() {
  // Renderers
  gl_rend = new THREE.WebGLRenderer();
  gl_rend.shadowMapEnabled = true;
  gl_rend.setSize(window.innerWidth*0.95, window.innerHeight*0.95);
  canvas_rend = new THREE.CanvasRenderer();
  canvas_rend.setSize(window.innerWidth*0.95, window.innerHeight*0.95);
  renderer = null;

  // Materials
  var blue_material =
    new THREE.MeshLambertMaterial({color:0x3300cc, overdraw: true});
  var black_material =
    new THREE.MeshLambertMaterial({color:0x000000, overdraw: true});
  var face_material =
    new THREE.MeshLambertMaterial({color:0xffff00, overdraw: true});
  box_material = Physijs.createMaterial(blue_material);
  head_material = Physijs.createMaterial(new THREE.MeshFaceMaterial(
    [blue_material, black_material, black_material,
     black_material, face_material, black_material]));
  head_material2 = Physijs.createMaterial(new THREE.MeshFaceMaterial(
    [blue_material, black_material, black_material,
     black_material, black_material, face_material]));
  red_material = Physijs.createMaterial(new THREE.MeshLambertMaterial(
    {color:0xff5500, overdraw: true}));
  green_material = Physijs.createMaterial(new THREE.MeshLambertMaterial(
    {color:0x55ff00, overdraw: true}));

  // Ground
  ground = new Physijs.BoxMesh(
    new THREE.CubeGeometry(100, 1, 100),
    Physijs.createMaterial(
      new THREE.MeshLambertMaterial({color:0x555555, overdraw: true}),
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

  scene = new Physijs.Scene;
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
  light.castShadow = true;
  light.shadowCameraLeft = -60;
  light.shadowCameraTop = -60;
  light.shadowCameraRight = 60;
  light.shadowCameraBottom = 60;
  light.shadowDarkness = .7;
  scene.add(light);
  light = new THREE.AmbientLight(0x404040);
  scene.add(light);
}

function init() {
  if ( $('#gl').attr('checked') != null ) {
    if ( renderer !== gl_rend ) {
      if ( renderer != null )
        $('#viewport').children().remove();
      renderer = gl_rend;
      $('#viewport').append(renderer.domElement);
    }
  } else {
    if ( renderer !== canvas_rend ) {
      if ( renderer != null )
        $('#viewport').children().remove();
      renderer = canvas_rend;
      $('#viewport').append(renderer.domElement);
    }
  }

  var box, constraint,
      haba = Number($('#haba').val()),
      okuyuki = Number($('#okuyuki').val()),
      takasa = 5, space = 1,
      w,h,d,x,y,z,m;

  count = 0;
  paused = false;
  jumptime = -1000;

  scene.setGravity(
    new THREE.Vector3(0, $('#grav').attr('checked') != null ? -30 : 0, 0));

  boxes = [];
  for ( var i = 0; i < 5; i++ ) {
    switch (i) {
    case 3:
      w = haba; h = takasa; d = okuyuki;
      x = 0; y = -35+i*(takasa+space); z = -10;
      if ( $('#arch').attr('checked') != null )
        z -= 0.1 * okuyuki;
      m = box_material;
      break;
    case 4:
      w = haba; h = takasa; d = okuyuki;
      x = 0; y = -35+i*(takasa+space); z = -10;
      if ( $('#arch').attr('checked') != null )
        z -= 0.35 * okuyuki;
      m = $('#front').attr('checked') == null ? head_material : head_material2;
      break;
    default:
      w = haba; h = takasa; d = okuyuki;
      x = 0; y = -35+i*(takasa+space); z = -10;
      m = box_material;
      break;
    }

    box = new Physijs.BoxMesh(new THREE.CubeGeometry(w,h,d), m);
    box.position.set(x,y,z);
    box.castShadow = true;
    boxes.push(box);
  }
  bottom = boxes[0];

  constraints = [];
  for ( var i = 0, len = boxes.length; i < len; ++i ) {
    var box = boxes[i];
    scene.add(box);

    if ( i === 0 )
      continue;

    var constraint = new Physijs.HingeConstraint(
      box,
      boxes[i-1],
      new THREE.Vector3(0, box.position.y - 0.5*(takasa+space),-10),
      new THREE.Vector3(1, 0, 0)
    );
    scene.addConstraint(constraint);
    constraints.push(constraint);
    constraint = new Physijs.HingeConstraint(
      box,
      boxes[i-1],
      new THREE.Vector3(0, i*(takasa+1)-13, -10),
      new THREE.Vector3(0, 0, 1)
    );
    scene.addConstraint(constraint);
    constraints.push(constraint);
  }

  scene.add(ground);

  if ( $('#wall').attr('checked') != null )
    scene.add(wall);

  controls.enabled = true;
  requestAnimationFrame(render);
  scene.simulate(undefined, 1);
};

function reset() {
  for ( var i = 0, len = constraints.length; i < len; ++i ) {
    scene.removeConstraint(constraints[i]);
  }

  for ( var i = 0, len = boxes.length; i < len; ++i )
    scene.remove(boxes[i]);
  scene.remove(ground);

  if ( $('#wall').attr('checked') != null )
    scene.remove(wall);

  renderer.render(scene, camera);
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
      effect = new THREE.Vector3(0,1,0).multiplyScalar(2700);
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
      effect = new THREE.Vector3(0,1,0).multiplyScalar(2700);
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
      reset();
      $('#startstop').val('start');
      $('#pause').attr('disabled', true).val('pause');
      $('#jump').attr('disabled', true);
      $('.arm').each(function() { $(this).attr('disabled', true); });
      $('#left-arm').val('緑腕↓');
      $('#red-arm').val('赤腕↓');
      $('#right').removeAttr('disabled');
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
