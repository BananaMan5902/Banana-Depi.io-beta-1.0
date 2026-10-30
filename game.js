
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WORLD = 4000;
const keys = {};
const mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false };

let player, bullets = [], enemies = [], shapes = [];
let camera = { x: 0, y: 0 };
let score = 0;
let gameOver = false;
let autoFire = false;
let autoSpin = false;
let lastTime = 0;
let classChoiceOpen = false;

const upgrades = [
  { name: "Bullet Damage", key: "damage", max: 8 },
  { name: "Reload Speed", key: "reload", max: 8 },
  { name: "Bullet Speed", key: "bulletSpeed", max: 8 },
  { name: "Bullet Penetration", key: "penetration", max: 8 },
  { name: "Max Health", key: "maxHealth", max: 8 },
  { name: "Health Regen", key: "regen", max: 8 },
  { name: "Movement Speed", key: "speed", max: 8 },
  { name: "Body Damage", key: "bodyDamage", max: 8 }
];

const tankClasses = {
  Basic: { barrels: 1, spread: 0, damage: 1, reload: 1 },
  Twin: { barrels: 2, spread: 0.16, damage: 0.8, reload: 0.8 },
  Sniper: { barrels: 1, spread: 0, damage: 2, reload: 1.8, range: 1.6 },
  MachineGun: { barrels: 1, spread: 0.25, damage: 0.65, reload: 0.35 },
  FlankGuard: { barrels: 2, spread: Math.PI, damage: 0.85, reload: 1.1 },
  Triplet: { barrels: 3, spread: 0.2, damage: 0.65, reload: 0.85 }
};

function resize() {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener("resize", resize);
resize();

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function makePlayer() {
  return {
    x: WORLD / 2,
    y: WORLD / 2,
    radius: 23,
    angle: 0,
    speed: 3,
    hp: 100,
    maxHp: 100,
    regen: 0,
    damage: 1,
    reload: 1,
    bulletSpeed: 1,
    penetration: 1,
    bodyDamage: 1,
    reloadTimer: 0,
    xp: 0,
    level: 1,
    nextXP: 100,
    upgrades: {},
    className: "Basic",
    invulnerable: 0
  };
}

function spawnShape() {
  const types = [
    { type: "square", radius: 20, hp: 30, xp: 15, color: "#e8ce32" },
    { type: "triangle", radius: 24, hp: 55, xp: 30, color: "#e58b35" },
    { type: "pentagon", radius: 35, hp: 150, xp: 100, color: "#5b91dc" }
  ];

  const t = types[Math.floor(Math.random() * types.length)];
  shapes.push({
    x: random(80, WORLD - 80),
    y: random(80, WORLD - 80),
    ...t,
    maxHp: t.hp,
    angle: random(0, Math.PI * 2)
  });
}

function spawnEnemy() {
  const a = random(0, Math.PI * 2);
  const d = random(450, 950);

  const tank = Math.random() < 0.35;
  enemies.push({
    x: Math.max(50, Math.min(WORLD - 50, player.x + Math.cos(a) * d)),
    y: Math.max(50, Math.min(WORLD - 50, player.y + Math.sin(a) * d)),
    radius: tank ? 23 : 18,
    hp: tank ? 110 : 55,
    maxHp: tank ? 110 : 55,
    speed: tank ? 1.5 : 2,
    damage: tank ? 13 : 7,
    angle: 0,
    fireTimer: random(0, 100),
    tank,
    color: tank ? "#db4545" : "#e58a37",
    reload: tank ? 100 : 145
  });
}

function addXP(amount) {
  player.xp += amount;
  score += amount;

  while (player.xp >= player.nextXP) {
    player.xp -= player.nextXP;
    player.level++;
    player.nextXP = Math.floor(player.nextXP * 1.25 + 25);
    player.upgradePoints = (player.upgradePoints || 0) + 1;
  }

  updateHUD();
  updateUpgradeButtons();
  if (player.level >= 15 && !player.classChosen) {
    showClassPanel();
  }
}

function updateHUD() {
  document.getElementById("level").textContent = "Level " + player.level;
  document.getElementById("score").textContent = "Score: " + score;
  document.getElementById("health").textContent =
    "HP: " + Math.ceil(player.hp) + "/" + player.maxHp;

  document.getElementById("xpBar").style.width =
    (player.xp / player.nextXP * 100) + "%";

  document.getElementById("xpText").textContent =
    Math.floor(player.xp) + " / " + player.nextXP + " XP";
}

function updateUpgradeButtons() {
  const panel = document.getElementById("upgradeButtons");
  panel.innerHTML = "";

  upgrades.forEach(u => {
    const count = player.upgrades[u.key] || 0;
    const button = document.createElement("button");
    button.textContent = u.name + " (" + count + "/" + u.max + ")";

    button.disabled = count >= u.max || !player.upgradePoints;

    button.onclick = () => {
      if (!player.upgradePoints || count >= u.max) return;

      player.upgradePoints--;
      player.upgrades[u.key] = count + 1;

      switch (u.key) {
        case "damage": player.damage += 0.35; break;
        case "reload": player.reload *= 0.88; break;
        case "bulletSpeed": player.bulletSpeed += 0.15; break;
        case "penetration": player.penetration += 1; break;
        case "maxHealth":
          player.maxHp += 20;
          player.hp += 20;
          break;
        case "regen": player.regen += 0.12; break;
        case "speed": player.speed += 0.2; break;
        case "bodyDamage": player.bodyDamage += 0.5; break;
      }

      updateUpgradeButtons();
      updateHUD();
    };

    panel.appendChild(button);
  });

  const heading = document.querySelector("#upgradePanel h2");
  heading.textContent = "UPGRADES (" + (player.upgradePoints || 0) + " POINTS)";
}

function showClassPanel() {
  if (classChoiceOpen || player.classChosen) return;

  classChoiceOpen = true;
  const panel = document.getElementById("classPanel");
  const buttons = document.getElementById("classButtons");
  panel.style.display = "block";
  buttons.innerHTML = "";

  ["Twin", "Sniper", "MachineGun", "FlankGuard", "Triplet"].forEach(name => {
    const b = document.createElement("button");
    b.textContent = name;
    b.onclick = () => {
      player.className = name;
      player.classChosen = true;
      classChoiceOpen = false;
      panel.style.display = "none";
    };
    buttons.appendChild(b);
  });
}

function shoot(x, y, angle, damage, speed, color = "#f5a623") {
  bullets.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    radius: 7,
    life: 100,
    color,
    penetration: player.penetration
  });
}

function playerShoot() {
  const c = tankClasses[player.className];
  const count = c.barrels;
  const angle = player.angle;
  const range = c.range || 1;
  const spread = c.spread;

  for (let i = 0; i < count; i++) {
    let a = angle;

    if (player.className === "FlankGuard") {
      a += i * Math.PI;
    } else if (count > 1) {
      a += (i - (count - 1) / 2) * spread;
    }

    shoot(
      player.x + Math.cos(a) * 30,
      player.y + Math.sin(a) * 30,
      a + random(-0.025, 0.025),
      14 * player.damage * c.damage,
      8 * player.bulletSpeed * range
    );
  }
}

function enemyShoot(enemy) {
  const a = enemy.angle;
  bullets.push({
    x: enemy.x + Math.cos(a) * 25,
    y: enemy.y + Math.sin(a) * 25,
    vx: Math.cos(a) * 6,
    vy: Math.sin(a) * 6,
    damage: enemy.damage,
    radius: 6,
    life: 100,
    color: "#df4545",
    penetration: 1,
    enemyBullet: true
  });
}

function die() {
  if (gameOver) return;
  gameOver = true;
  document.getElementById("finalScore").textContent =
    "Final score: " + score + " | Level " + player.level;
  document.getElementById("gameOver").style.display = "block";
}

document.getElementById("restart").onclick = () => {
  startGame();
};

function startGame() {
  player = makePlayer();
  bullets = [];
  enemies = [];
  shapes = [];
  score = 0;
  gameOver = false;
  autoFire = false;
  autoSpin = false;
  classChoiceOpen = false;

  document.getElementById("gameOver").style.display = "none";
  document.getElementById("classPanel").style.display = "none";

  for (let i = 0; i < 100; i++) spawnShape();
  for (let i = 0; i < 16; i++) spawnEnemy();

  updateHUD();
  updateUpgradeButtons();
}

window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;

  if (e.key.toLowerCase() === "e") autoFire = !autoFire;
  if (e.key.toLowerCase() === "m") autoSpin = !autoSpin;
});

window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

canvas.addEventListener("mousedown", () => mouse.down = true);
window.addEventListener("mouseup", () => mouse.down = false);

function update(dt) {
  if (gameOver) return;

  const step = Math.min(dt / 16.67, 2);

  let dx = 0, dy = 0;
  if (keys.w || keys.arrowup) dy--;
  if (keys.s || keys.arrowdown) dy++;
  if (keys.a || keys.arrowleft) dx--;
  if (keys.d || keys.arrowright) dx++;

  const len = Math.hypot(dx, dy) || 1;
  player.x += dx / len * player.speed * step;
  player.y += dy / len * player.speed * step;

  player.x = Math.max(30, Math.min(WORLD - 30, player.x));
  player.y = Math.max(30, Math.min(WORLD - 30, player.y));

  camera.x = player.x - innerWidth / 2;
  camera.y = player.y - innerHeight / 2;

  const worldMouseX = mouse.x + camera.x;
  const worldMouseY = mouse.y + camera.y;

  if (autoSpin) {
    player.angle += 0.055 * step;
  } else {
    player.angle = Math.atan2(
      worldMouseY - player.y,
      worldMouseX - player.x
    );
  }

  player.invulnerable = Math.max(0, player.invulnerable - step);
  player.hp = Math.min(player.maxHp, player.hp + player.regen * step);

  player.reloadTimer -= step;

  if ((mouse.down || autoFire) && player.reloadTimer <= 0) {
    playerShoot();
    const c = tankClasses[player.className];
    player.reloadTimer = 12 * player.reload * c.reload;
  }

  for (const enemy of enemies) {
    const dist = distance(enemy, player);
    enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);

    if (dist > 180) {
      enemy.x += Math.cos(enemy.angle) * enemy.speed * step;
      enemy.y += Math.sin(enemy.angle) * enemy.speed * step;
    }

    enemy.fireTimer -= step;

    if (dist < 850 && enemy.fireTimer <= 0) {
      enemyShoot(enemy);
      enemy.fireTimer = enemy.reload;
    }

    if (dist < player.radius + enemy.radius && player.invulnerable <= 0) {
      player.hp -= 0.18 * enemy.damage * step;
      enemy.hp -= player.bodyDamage * 0.2 * step;
    }
  }

  enemies = enemies.filter(e => {
    if (e.hp <= 0) {
      addXP(e.tank ? 80 : 40);
      return false;
    }
    return true;
  });

  for (const b of bullets) {
    b.x += b.vx * step;
    b.y += b.vy * step;
    b.life -= step;

    if (b.enemyBullet) {
      if (player.invulnerable <= 0 &&
          Math.hypot(b.x - player.x, b.y - player.y) < player.radius + b.radius) {
        player.hp -= b.damage;
        player.invulnerable = 5;
        b.life = 0;
      }
    } else {
      for (const e of enemies) {
        if (e.hp > 0 && Math.hypot(b.x - e.x, b.y - e.y) < e.radius + b.radius) {
          e.hp -= b.damage;
          b.penetration--;

          if (b.penetration <= 0) {
            b.life = 0;
            break;
          }
        }
      }

      for (const s of shapes) {
        if (s.hp > 0 && Math.hypot(b.x - s.x, b.y - s.y) < s.radius + b.radius) {
          s.hp -= b.damage;
          b.penetration--;

          if (b.penetration <= 0) {
            b.life = 0;
            break;
          }
        }
      }
    }
  }

  bullets = bullets.filter(b => b.life > 0);

  shapes = shapes.filter(s => {
    if (s.hp <= 0) {
      addXP(s.xp);
      return false;
    }
    return true;
  });

  while (shapes.length < 100) spawnShape();
  while (enemies.length < 16) spawnEnemy();

  if (player.hp <= 0) die();

  updateHUD();
}

function polygon(x, y, radius, sides, color, angle = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = angle + i * Math.PI * 2 / sides;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.2)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawTank(x, y, angle, color, radius, className = "Basic") {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const c = tankClasses[className] || tankClasses.Basic;

  for (let i = 0; i < c.barrels; i++) {
    let a = 0;

    if (className === "FlankGuard") a = i * Math.PI;
    else if (c.barrels > 1) a = (i - (c.barrels - 1) / 2) * c.spread;

    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = "#888";
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    ctx.fillRect(5, -7, 37, 14);
    ctx.strokeRect(5, -7, 37, 14);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#555";
  ctx.stroke();

  ctx.restore();
}

function drawHealthBar(x, y, hp, maxHp, width = 40) {
  ctx.fillStyle = "#555";
  ctx.fillRect(x - width / 2, y, width, 5);
  ctx.fillStyle = "#51c75a";
  ctx.fillRect(x - width / 2, y, width * Math.max(0, hp / maxHp), 5);
}

function drawMinimap() {
  const size = 150;
  const x = innerWidth - size - 15;
  const y = 15;

  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = "#777";
  ctx.strokeRect(x, y, size, size);

  const scale = size / WORLD;

  for (const e of enemies) {
    ctx.fillStyle = "#e04444";
    ctx.fillRect(x + e.x * scale - 1, y + e.y * scale - 1, 3, 3);
  }

  ctx.fillStyle = "#d5a900";
  for (const s of shapes) {
    ctx.fillRect(x + s.x * scale, y + s.y * scale, 2, 2);
  }

  ctx.fillStyle = "#2375ed";
  ctx.beginPath();
  ctx.arc(x + player.x * scale, y + player.y * scale, 3, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  ctx.fillStyle = "#eeeeee";
  ctx.fillRect(0, 0, WORLD, WORLD);

  ctx.strokeStyle = "#d7d7d7";
  ctx.lineWidth = 1;

  for (let x = 0; x <= WORLD; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD);
    ctx.stroke();
  }

  for (let y = 0; y <= WORLD; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#555";
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, WORLD, WORLD);

  for (const s of shapes) {
    const sides = s.type === "square" ? 4 : s.type === "triangle" ? 3 : 5;
    polygon(s.x, s.y, s.radius, sides, s.color, s.angle);

    if (s.hp < s.maxHp) {
      drawHealthBar(s.x, s.y + s.radius + 7, s.hp, s.maxHp, s.radius * 2);
    }
  }

  for (const e of enemies) {
    drawTank(e.x, e.y, e.angle, e.color, e.radius);
    drawHealthBar(e.x, e.y + e.radius + 8, e.hp, e.maxHp, 40);
  }

  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
  }

  if (player.invulnerable <= 0 || Math.floor(performance.now() / 100) % 2 === 0) {
    drawTank(player.x, player.y, player.angle, "#3689e9", player.radius, player.className);
  }

  ctx.restore();

  drawMinimap();
}

function loop(timestamp) {
  const dt = lastTime ? timestamp - lastTime : 16.67;
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

startGame();
requestAnimationFrame(loop);
