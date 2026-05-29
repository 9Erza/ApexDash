const dgram = require("dgram");
const http = require("http");
const WebSocket = require("ws");

// ApexDash by 9Erza - data-only build
// Forza Data Out -> ApexDash only. No SimHub relay. No hotkeys.

const FORZA_PORT = 23666;
const FORZA_HOST = "127.0.0.1"; // Forza Data Out IP should be 127.0.0.1
const DEBUG_HTTP_PORT = 28766;

const ACTIONS = {
  SPEED: "com.nineerza.apexdash.speed",
  RPM: "com.nineerza.apexdash.rpm",
  GEAR: "com.nineerza.apexdash.gear",
  BOOST: "com.nineerza.apexdash.boost",
  METRIC: "com.nineerza.apexdash.metric",
  GAUGE: "com.nineerza.apexdash.gauge",
  SHIFT: "com.nineerza.apexdash.shiftlight",
  TIRES: "com.nineerza.apexdash.tires",
  GRIP: "com.nineerza.apexdash.grip",
  INPUT: "com.nineerza.apexdash.inputmonitor",
  SESSION: "com.nineerza.apexdash.session",
  STATUS: "com.nineerza.apexdash.status"
};

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const port = arg("-port");
const pluginUUID = arg("-pluginUUID");
const registerEvent = arg("-registerEvent");

let websocket = null;
const contexts = new Map();

const state = {
  connected: false,
  raceOn: false,
  udpBound: false,
  udpBindAddress: `${FORZA_HOST}:${FORZA_PORT}`,
  udpError: "",
  lastPacketTime: 0,
  lastPacketAgeMs: null,
  packetRate: 0,
  packetSize: 0,
  rawPacketCount: 0,
  validPacketCount: 0,
  shortPacketCount: 0,
  lastSource: "",
  lastHexHead: "",

  speedKmh: 0,
  rpm: 0,
  maxRpm: 0,
  rpmPercent: 0,
  gear: 0,

  powerHp: 0,
  powerKw: 0,
  torqueNm: 0,
  boostPsi: 0,
  boostBar: 0,
  fuelPercent: 0,

  throttle: 0,
  brake: 0,
  clutch: 0,
  handbrake: 0,
  steer: 0,

  carClass: 0,
  pi: 0,
  drivetrain: "UNK",
  cylinders: 0,

  tireFL: 0,
  tireFR: 0,
  tireRL: 0,
  tireRR: 0,

  slipFL: 0,
  slipFR: 0,
  slipRL: 0,
  slipRR: 0,

  accelX: 0,
  accelY: 0,
  accelZ: 0,

  maxSpeed: 0,
  maxBoostBar: 0,
  maxPowerHp: 0,
  zeroToHundredBest: null,
  zeroToHundredStartTime: null,
  zeroToHundredArmed: true,
  zeroToHundredRunning: false
};

function readPacket(buffer) {
  // FH6 Data Out is 324 bytes. We only read fields needed by ApexDash.
  return {
    isRaceOn: buffer.readInt32LE(0),
    timestamp: buffer.readUInt32LE(4),
    maxRpm: buffer.readFloatLE(8),
    idleRpm: buffer.readFloatLE(12),
    rpm: buffer.readFloatLE(16),

    accelX: buffer.readFloatLE(20),
    accelY: buffer.readFloatLE(24),
    accelZ: buffer.readFloatLE(28),

    slipFL: buffer.readFloatLE(180),
    slipFR: buffer.readFloatLE(184),
    slipRL: buffer.readFloatLE(188),
    slipRR: buffer.readFloatLE(192),

    carClass: buffer.readInt32LE(216),
    pi: buffer.readInt32LE(220),
    drivetrainType: buffer.readInt32LE(224),
    cylinders: buffer.readInt32LE(228),

    speed: buffer.readFloatLE(256),
    power: buffer.readFloatLE(260),
    torque: buffer.readFloatLE(264),

    tireFL: buffer.readFloatLE(268),
    tireFR: buffer.readFloatLE(272),
    tireRL: buffer.readFloatLE(276),
    tireRR: buffer.readFloatLE(280),

    boost: buffer.readFloatLE(284),
    fuel: buffer.readFloatLE(288),

    throttle: buffer.readUInt8(315),
    brake: buffer.readUInt8(316),
    clutch: buffer.readUInt8(317),
    handbrake: buffer.readUInt8(318),
    gear: buffer.readUInt8(319),
    steer: buffer.readInt8(320)
  };
}

function updateState(p, size, source, head) {
  const now = Date.now();

  state.connected = true;
  state.raceOn = p.isRaceOn === 1;
  state.lastPacketTime = now;
  state.lastPacketAgeMs = 0;
  state.packetSize = size;
  state.validPacketCount += 1;
  state.lastSource = source || "";
  state.lastHexHead = head || "";
  state.udpError = "";

  state.speedKmh = safeNumber(p.speed * 3.6);
  state.rpm = safeNumber(p.rpm);
  state.maxRpm = safeNumber(p.maxRpm);
  state.rpmPercent = p.maxRpm > 0 ? clamp((p.rpm / p.maxRpm) * 100, 0, 100) : 0;
  state.gear = p.gear;

  state.powerKw = safeNumber(p.power / 1000);
  state.powerHp = safeNumber(p.power / 735.5);
  state.torqueNm = safeNumber(p.torque);
  state.boostPsi = safeNumber(p.boost);
  state.boostBar = safeNumber(p.boost * 0.0689476);
  state.fuelPercent = safeNumber(p.fuel * 100);

  state.throttle = p.throttle;
  state.brake = p.brake;
  state.clutch = p.clutch;
  state.handbrake = p.handbrake;
  state.steer = p.steer;

  state.carClass = p.carClass;
  state.pi = p.pi;
  state.drivetrain = drivetrainName(p.drivetrainType);
  state.cylinders = p.cylinders;

  state.tireFL = safeNumber(p.tireFL);
  state.tireFR = safeNumber(p.tireFR);
  state.tireRL = safeNumber(p.tireRL);
  state.tireRR = safeNumber(p.tireRR);

  state.slipFL = safeNumber(p.slipFL);
  state.slipFR = safeNumber(p.slipFR);
  state.slipRL = safeNumber(p.slipRL);
  state.slipRR = safeNumber(p.slipRR);

  state.accelX = safeNumber(p.accelX);
  state.accelY = safeNumber(p.accelY);
  state.accelZ = safeNumber(p.accelZ);

  if (!state.raceOn) return;

  if (state.speedKmh > state.maxSpeed) state.maxSpeed = state.speedKmh;
  if (state.boostBar > state.maxBoostBar) state.maxBoostBar = state.boostBar;
  if (state.powerHp > state.maxPowerHp) state.maxPowerHp = state.powerHp;

  updateZeroToHundred(now);
}

function updateZeroToHundred(now) {
  const speed = state.speedKmh;
  const throttlePercent = (state.throttle / 255) * 100;

  if (speed < 2 && !state.zeroToHundredRunning) state.zeroToHundredArmed = true;

  if (state.zeroToHundredArmed && !state.zeroToHundredRunning && speed < 5 && throttlePercent > 25) {
    state.zeroToHundredRunning = true;
    state.zeroToHundredArmed = false;
    state.zeroToHundredStartTime = now;
  }

  if (state.zeroToHundredRunning && speed >= 100) {
    const result = (now - state.zeroToHundredStartTime) / 1000;
    state.zeroToHundredRunning = false;
    state.zeroToHundredBest = state.zeroToHundredBest === null ? result : Math.min(state.zeroToHundredBest, result);
  }

  if (state.zeroToHundredRunning && speed < 1 && throttlePercent < 5) state.zeroToHundredRunning = false;
}

function drivetrainName(value) {
  if (value === 0) return "FWD";
  if (value === 1) return "RWD";
  if (value === 2) return "AWD";
  return "UNK";
}

let packetsThisSecond = 0;
let udpReceiver = null;
let debugServer = null;
let monitorTimer = null;
let renderTimer = null;
let telemetryActive = false;
let stopRuntimeTimer = null;

function startRuntime() {
  if (telemetryActive) return;

  telemetryActive = true;
  state.udpError = "";
  state.udpBindAddress = `${FORZA_HOST}:${FORZA_PORT}`;

  startUdpReceiver();
  startDebugServer();
  startRenderLoop();

  if (!monitorTimer) {
    monitorTimer = setInterval(updateConnectionState, 1000);
  }

  log("ApexDash runtime active");
}

function scheduleRuntimeStop() {
  if (stopRuntimeTimer) clearTimeout(stopRuntimeTimer);

  stopRuntimeTimer = setTimeout(() => {
    if (contexts.size === 0) stopRuntime(false);
  }, 5000);
}

function stopRuntime(finalShutdown) {
  if (stopRuntimeTimer) {
    clearTimeout(stopRuntimeTimer);
    stopRuntimeTimer = null;
  }

  if (udpReceiver) {
    try { udpReceiver.close(); } catch {}
    udpReceiver = null;
  }

  if (debugServer) {
    try { debugServer.close(); } catch {}
    debugServer = null;
  }

  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }

  if (renderTimer) {
    clearInterval(renderTimer);
    renderTimer = null;
  }

  telemetryActive = false;
  packetsThisSecond = 0;
  state.packetRate = 0;
  state.udpBound = false;

  if (!finalShutdown) {
    state.connected = false;
    state.raceOn = false;
    state.lastPacketAgeMs = null;
    log("ApexDash runtime idle");
  }
}

function startUdpReceiver() {
  if (udpReceiver) return;

  udpReceiver = dgram.createSocket({ type: "udp4", reuseAddr: false });

  udpReceiver.on("message", (msg, rinfo) => {
    packetsThisSecond += 1;
    state.rawPacketCount += 1;
    state.packetSize = msg.length;
    state.lastPacketTime = Date.now();
    state.lastPacketAgeMs = 0;
    state.lastSource = `${rinfo.address}:${rinfo.port}`;
    state.lastHexHead = msg.subarray(0, 12).toString("hex").match(/.{1,2}/g)?.join(" ") || "";

    if (msg.length < 324) {
      state.shortPacketCount += 1;
      return;
    }

    try {
      updateState(readPacket(msg), msg.length, state.lastSource, state.lastHexHead);
    } catch (e) {
      state.udpError = e.message;
      log("Packet parse error: " + e.message);
    }
  });

  udpReceiver.on("error", (err) => {
    state.connected = false;
    state.raceOn = false;
    state.udpBound = false;
    state.udpError = err.message;
    log("UDP error: " + err.message);
  });

  udpReceiver.bind(FORZA_PORT, FORZA_HOST, () => {
    state.udpBound = true;
    state.udpBindAddress = `${FORZA_HOST}:${FORZA_PORT}`;
    log("Listening Forza UDP on " + state.udpBindAddress);
    log("SimHub relay disabled. ApexDash is data-only.");
  });
}

function updateConnectionState() {
  state.packetRate = packetsThisSecond;
  packetsThisSecond = 0;

  if (!telemetryActive || state.lastPacketTime === 0) {
    state.connected = false;
    state.raceOn = false;
    state.lastPacketAgeMs = null;
    return;
  }

  const age = Date.now() - state.lastPacketTime;
  state.lastPacketAgeMs = age;
  if (age > 2500) {
    state.connected = false;
    state.raceOn = false;
  }
}

// Local debug endpoint. It starts only while at least one ApexDash tile is visible.
function startDebugServer() {
  if (debugServer) return;

  debugServer = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/state") {
      sendJson(res, publicState());
      return;
    }

    if (req.url === "/simulate") {
      injectTestPacket();
      sendJson(res, { ok: true, message: "Injected test telemetry for a few seconds", state: publicState() });
      return;
    }

    sendJson(res, { ok: false, error: "Not found. Use /state or /simulate" }, 404);
  });

  debugServer.on("error", (e) => log("Debug HTTP error: " + e.message));
  debugServer.listen(DEBUG_HTTP_PORT, "127.0.0.1", () => {
    log(`Debug HTTP: http://127.0.0.1:${DEBUG_HTTP_PORT}/state`);
  });
}

function sendJson(res, payload, status = 200) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function publicState() {
  return {
    active: telemetryActive,
    visibleContexts: contexts.size,
    connected: state.connected,
    raceOn: state.raceOn,
    udpBound: state.udpBound,
    udpBindAddress: state.udpBindAddress,
    udpError: state.udpError,
    lastPacketAgeMs: state.lastPacketAgeMs,
    packetRate: state.packetRate,
    packetSize: state.packetSize,
    rawPacketCount: state.rawPacketCount,
    validPacketCount: state.validPacketCount,
    shortPacketCount: state.shortPacketCount,
    lastSource: state.lastSource,
    lastHexHead: state.lastHexHead,
    speedKmh: round(state.speedKmh, 1),
    rpm: Math.round(state.rpm),
    maxRpm: Math.round(state.maxRpm),
    rpmPercent: round(state.rpmPercent, 1),
    gear: state.gear,
    boostBar: round(state.boostBar, 2),
    powerHp: round(state.powerHp, 1),
    fuelPercent: round(state.fuelPercent, 1)
  };
}

function injectTestPacket() {
  if (!telemetryActive) startRuntime();

  const b = Buffer.alloc(324);
  b.writeInt32LE(1, 0);
  b.writeUInt32LE(Date.now() % 4294967295, 4);
  b.writeFloatLE(8000, 8);
  b.writeFloatLE(900, 12);
  b.writeFloatLE(4321, 16);
  b.writeFloatLE(0.1, 20);
  b.writeFloatLE(0, 24);
  b.writeFloatLE(6, 28);
  b.writeFloatLE(0.05, 180);
  b.writeFloatLE(0.05, 184);
  b.writeFloatLE(0.12, 188);
  b.writeFloatLE(0.12, 192);
  b.writeInt32LE(4, 216);
  b.writeInt32LE(715, 220);
  b.writeInt32LE(1, 224);
  b.writeInt32LE(4, 228);
  b.writeFloatLE(27.78, 256); // 100 km/h
  b.writeFloatLE(150000, 260);
  b.writeFloatLE(300, 264);
  b.writeFloatLE(90, 268);
  b.writeFloatLE(91, 272);
  b.writeFloatLE(92, 276);
  b.writeFloatLE(93, 280);
  b.writeFloatLE(0.5, 284);
  b.writeFloatLE(1, 288);
  b.writeUInt8(255, 315);
  b.writeUInt8(0, 316);
  b.writeUInt8(255, 317);
  b.writeUInt8(0, 318);
  b.writeUInt8(3, 319);
  b.writeInt8(0, 320);

  const p = readPacket(b);
  updateState(p, b.length, "internal-test", b.subarray(0, 12).toString("hex"));
}

function connectStreamDock() {
  if (!port || !pluginUUID || !registerEvent) {
    console.log("This plugin must be started by Stream Dock.");
    return;
  }

  websocket = new WebSocket("ws://127.0.0.1:" + port);

  websocket.on("open", () => {
    send({ event: registerEvent, uuid: pluginUUID });
    log("ApexDash v0.4.4 data-only lazy runtime started");
  });

  websocket.on("message", (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    handleEvent(msg);
  });

  websocket.on("error", (err) => console.log("WebSocket error:", err.message));
  websocket.on("close", () => {
    stopRuntime(true);
    process.exit(0);
  });
}

function handleEvent(msg) {
  if (msg.event === "willAppear") {
    const settings = normalizeSettings(msg.action, msg.payload?.settings || {});
    contexts.set(msg.context, {
      action: msg.action,
      settings,
      lastImageKey: "",
      lastRenderTime: 0
    });

    if (stopRuntimeTimer) {
      clearTimeout(stopRuntimeTimer);
      stopRuntimeTimer = null;
    }

    startRuntime();
    clearTitle(msg.context);
    renderContext(msg.context, true);
  }

  if (msg.event === "willDisappear") {
    contexts.delete(msg.context);
    if (contexts.size === 0) scheduleRuntimeStop();
  }

  if (msg.event === "didReceiveSettings") {
    const ctx = contexts.get(msg.context);
    if (!ctx) return;
    ctx.settings = normalizeSettings(ctx.action, msg.payload?.settings || {});
    ctx.lastImageKey = "";
    renderContext(msg.context, true);
  }

  if (msg.event === "keyUp") {
    const ctx = contexts.get(msg.context);
    if (!ctx) return;
    if (ctx.action === ACTIONS.SESSION) resetSessionStats();
    if (ctx.action === ACTIONS.STATUS) {
      // Quick manual self-test for diagnostics.
      injectTestPacket();
      ctx.lastImageKey = "";
      renderContext(msg.context, true);
    }
  }
}

function normalizeSettings(action, settings) {
  const base = {
    theme: settings.theme || "erza",
    refresh: settings.refresh || (action === ACTIONS.SHIFT || action === ACTIONS.INPUT ? "fast" : "normal")
  };

  if (action === ACTIONS.SPEED) base.metric = "speed";
  if (action === ACTIONS.RPM) base.metric = "rpm";
  if (action === ACTIONS.GEAR) base.metric = "gear";
  if (action === ACTIONS.BOOST) base.metric = "boost";

  if (action === ACTIONS.METRIC || action === ACTIONS.GAUGE) base.metric = settings.metric || (action === ACTIONS.GAUGE ? "rpm" : "speed");
  if (action === ACTIONS.SHIFT) {
    base.segment = settings.segment || "1";
    base.segments = settings.segments || "5";
  }
  if (action === ACTIONS.TIRES) base.tireMode = settings.tireMode || "temps4";
  if (action === ACTIONS.INPUT) base.inputMode = settings.inputMode || "pedals";
  if (action === ACTIONS.SESSION) base.sessionStat = settings.sessionStat || "maxspeed";
  if (action === ACTIONS.STATUS) base.statusMode = settings.statusMode || "packets";

  return base;
}

function startRenderLoop() {
  if (renderTimer) return;

  renderTimer = setInterval(() => {
    for (const context of contexts.keys()) renderContext(context, false);
  }, 100);
}

function renderContext(context, force) {
  const ctx = contexts.get(context);
  if (!ctx) return;

  const now = Date.now();
  const minMs = refreshDelay(ctx.settings.refresh);
  if (!force && now - ctx.lastRenderTime < minMs) return;
  ctx.lastRenderTime = now;

  const tile = buildTileForContext(ctx);
  const key = JSON.stringify(tile) + ctx.settings.theme;
  if (!force && key === ctx.lastImageKey) return;
  ctx.lastImageKey = key;

  send({ event: "setImage", context, payload: { image: makeImage(tile, ctx.settings.theme), target: 0 } });
}

function buildTileForContext(ctx) {
  if (ctx.action === ACTIONS.STATUS) return statusTile(ctx.settings.statusMode);

  if (state.udpError && !state.connected) return makeTile("UDP", "ERROR", "", "alert", 0, "#ff3333", "#220000");
  if (!state.connected) return makeTile("NO", "DATA", "", "alert", 0, "#ffaa00", "#1b1200");
  if (!state.raceOn) return makeTile("PAUSE", "FORZA", "", "idle", 0, "#999999", "#111111");

  if (ctx.action === ACTIONS.SPEED || ctx.action === ACTIONS.RPM || ctx.action === ACTIONS.GEAR || ctx.action === ACTIONS.BOOST) return metricTile(ctx.settings.metric, false);
  if (ctx.action === ACTIONS.METRIC || ctx.action === ACTIONS.GAUGE) return metricTile(ctx.settings.metric, ctx.action === ACTIONS.GAUGE);
  if (ctx.action === ACTIONS.SHIFT) return shiftTile(ctx.settings);
  if (ctx.action === ACTIONS.TIRES) return tireTile(ctx.settings.tireMode);
  if (ctx.action === ACTIONS.GRIP) return gripTile();
  if (ctx.action === ACTIONS.INPUT) return inputTile(ctx.settings.inputMode);
  if (ctx.action === ACTIONS.SESSION) return sessionTile(ctx.settings.sessionStat);

  return metricTile("speed", false);
}

function refreshDelay(value) {
  if (value === "eco") return 500;
  if (value === "fast") return 100;
  return 250;
}

function metricTile(metric, forceGauge) {
  const maxTire = Math.max(state.tireFL, state.tireFR, state.tireRL, state.tireRR);
  const frontSlip = Math.max(Math.abs(state.slipFL), Math.abs(state.slipFR));
  const rearSlip = Math.max(Math.abs(state.slipRL), Math.abs(state.slipRR));
  const maxSlip = Math.max(frontSlip, rearSlip);
  const gForce = Math.sqrt(state.accelX * state.accelX + state.accelZ * state.accelZ) / 9.81;

  if (metric === "rpm") return makeTile(String(Math.round(state.rpm)), "RPM", Math.round(state.rpmPercent) + "%", "gauge", state.rpmPercent, state.rpmPercent >= 92 ? "#ff3333" : "#00A4DC", state.rpmPercent >= 92 ? "#220000" : "#07111f");
  if (metric === "gear") return makeTile(String(state.gear), "GEAR", "", "big", 0, state.rpmPercent >= 92 ? "#ff3333" : "#ffcc33", "#111111");
  if (metric === "boost") return makeTile(state.boostBar.toFixed(1), "BOOST", "bar", forceGauge ? "gauge" : "big", clamp((state.boostBar / 1.5) * 100, 0, 100), "#00A4DC", "#07111f");
  if (metric === "power") return makeTile(String(Math.round(state.powerHp)), "POWER", "KM", "big", 0, "#ffcc33", "#151000");
  if (metric === "torque") return makeTile(String(Math.round(state.torqueNm)), "TORQUE", "Nm", "big", 0, "#ffcc33", "#151000");
  if (metric === "fuel") return makeTile(String(Math.round(state.fuelPercent)), "FUEL", "%", "gauge", state.fuelPercent, state.fuelPercent < 15 ? "#ff3333" : "#00A4DC", state.fuelPercent < 15 ? "#220000" : "#07111f");
  if (metric === "throttle") return percentTile((state.throttle / 255) * 100, "THR", "#00cc66", "#06150d");
  if (metric === "brake") return percentTile((state.brake / 255) * 100, "BRK", "#ff3333", "#1a0505");
  if (metric === "clutch") return percentTile((state.clutch / 255) * 100, "CLUTCH", "#00A4DC", "#07111f");
  if (metric === "handbrake") return percentTile((state.handbrake / 255) * 100, "HAND", "#ffaa00", "#221800");
  if (metric === "steer") return makeTile(String(state.steer), "STEER", "", "big", 0, "#00A4DC", "#07111f");
  if (metric === "tiretemp") return makeTile(String(Math.round(maxTire)), "TIRES", "°F", "big", 0, maxTire > 260 ? "#ff3333" : "#00A4DC", maxTire > 260 ? "#220000" : "#07111f");
  if (metric === "slip") return makeTile(maxSlip.toFixed(2), rearSlip > frontSlip ? "REAR" : "FRONT", "SLIP", "big", 0, maxSlip > 0.7 ? "#ff3333" : maxSlip > 0.35 ? "#ffaa00" : "#00cc66", maxSlip > 0.7 ? "#220000" : maxSlip > 0.35 ? "#221800" : "#06150d");
  if (metric === "grip") return gripTile();
  if (metric === "pi") return makeTile(String(state.pi), carClassName(state.carClass), "PI", "big", 0, "#ffcc33", "#111111");
  if (metric === "drivetrain") return makeTile(state.drivetrain, "DRIVE", state.cylinders + " CYL", "big", 0, "#00A4DC", "#07111f");
  if (metric === "gforce") return makeTile(gForce.toFixed(1), "G-FORCE", "G", "big", 0, gForce > 1.2 ? "#ff3333" : "#00A4DC", gForce > 1.2 ? "#220000" : "#07111f");
  if (metric === "maxspeed") return makeTile(String(Math.round(state.maxSpeed)), "MAX", "km/h", "big", 0, "#ffcc33", "#151000");

  return makeTile(String(Math.round(state.speedKmh)), "SPEED", "km/h", forceGauge ? "gauge" : "big", clamp((state.speedKmh / 350) * 100, 0, 100), "#00A4DC", "#07111f");
}

function percentTile(percent, label, color, bg) {
  return makeTile(String(Math.round(percent)), label, "%", "gauge", percent, color, bg);
}

function shiftTile(settings) {
  const segment = Number(settings.segment || 1);
  const segments = Number(settings.segments || 5);
  const start = 55;
  const end = 97;
  const threshold = start + ((end - start) / Math.max(segments - 1, 1)) * (segment - 1);
  const active = state.rpmPercent >= threshold;
  const red = state.rpmPercent >= 94;
  const flash = red && Math.floor(Date.now() / 180) % 2 === 0;
  const color = !active ? "#333333" : red ? (flash ? "#ff3333" : "#5a0000") : segment >= segments - 1 ? "#ffaa00" : "#00A4DC";
  return makeTile(active && red ? "SHIFT" : String(segment), "RPM", Math.round(threshold) + "%", "gauge", active ? 100 : 0, color, active ? "#090909" : "#050505");
}

function tireTile(mode) {
  const maxTire = Math.max(state.tireFL, state.tireFR, state.tireRL, state.tireRR);
  const avgFrontSlip = (Math.abs(state.slipFL) + Math.abs(state.slipFR)) / 2;
  const avgRearSlip = (Math.abs(state.slipRL) + Math.abs(state.slipRR)) / 2;
  if (mode === "slip") {
    const maxSlip = Math.max(avgFrontSlip, avgRearSlip);
    return makeTile(maxSlip.toFixed(2), avgRearSlip > avgFrontSlip ? "REAR" : "FRONT", "SLIP", "big", 0, maxSlip > 0.7 ? "#ff3333" : maxSlip > 0.35 ? "#ffaa00" : "#00cc66", maxSlip > 0.7 ? "#220000" : "#07111f");
  }
  if (mode === "maxtemp") return makeTile(String(Math.round(maxTire)), "MAX TIRE", "°F", "big", 0, maxTire > 260 ? "#ff3333" : "#00A4DC", maxTire > 260 ? "#220000" : "#07111f");
  return makeTile(`${Math.round(state.tireFL)} ${Math.round(state.tireFR)}`, "TIRES", `${Math.round(state.tireRL)} ${Math.round(state.tireRR)}`, "four", 0, "#00A4DC", "#07111f");
}

function gripTile() {
  const frontSlip = Math.max(Math.abs(state.slipFL), Math.abs(state.slipFR));
  const rearSlip = Math.max(Math.abs(state.slipRL), Math.abs(state.slipRR));
  const maxSlip = Math.max(frontSlip, rearSlip);
  if (maxSlip > 0.8) return makeTile("BAD", "GRIP", "", "alert", 0, "#ff3333", "#220000");
  if (rearSlip > 0.42 && state.throttle > 80) return makeTile("REAR", "SLIP", "", "alert", 0, "#ffaa00", "#221800");
  if (frontSlip > 0.42 && Math.abs(state.steer) > 20) return makeTile("UNDER", "STEER", "", "alert", 0, "#ffaa00", "#221800");
  return makeTile("GOOD", "GRIP", "", "alert", 0, "#00cc66", "#06150d");
}

function inputTile(mode) {
  if (mode === "steer") return makeTile(String(state.steer), "STEER", "", "big", 0, "#00A4DC", "#07111f");
  if (mode === "throttle") return percentTile((state.throttle / 255) * 100, "THR", "#00cc66", "#06150d");
  if (mode === "brake") return percentTile((state.brake / 255) * 100, "BRK", "#ff3333", "#1a0505");
  if (mode === "clutch") return percentTile((state.clutch / 255) * 100, "CLT", "#00A4DC", "#07111f");
  if (mode === "handbrake") return percentTile((state.handbrake / 255) * 100, "HAND", "#ffaa00", "#221800");
  return makeTile(`${Math.round((state.throttle / 255) * 100)}`, "THR/BRK", `${Math.round((state.brake / 255) * 100)}%`, "gauge", (state.throttle / 255) * 100, "#00cc66", "#06150d");
}

function sessionTile(stat) {
  if (stat === "maxboost") return makeTile(state.maxBoostBar.toFixed(1), "MAX BST", "bar", "big", 0, "#00A4DC", "#07111f");
  if (stat === "maxpower") return makeTile(String(Math.round(state.maxPowerHp)), "MAX PWR", "KM", "big", 0, "#ffcc33", "#151000");
  if (stat === "zero100") {
    const value = state.zeroToHundredRunning ? ((Date.now() - state.zeroToHundredStartTime) / 1000).toFixed(1) : state.zeroToHundredBest === null ? "--" : state.zeroToHundredBest.toFixed(1);
    return makeTile(value, "0-100", "sec", "big", 0, "#ffcc33", "#151000");
  }
  return makeTile(String(Math.round(state.maxSpeed)), "MAX", "km/h", "big", 0, "#ffcc33", "#151000");
}

function statusTile(mode) {
  if (!telemetryActive) return makeTile("IDLE", "RUNTIME", "", "idle", 0, "#999999", "#111111");
  if (state.udpError) return makeTile("UDP", "ERROR", "", "alert", 0, "#ff3333", "#220000");
  if (mode === "ports") return makeTile("23666", "FORZA", "LOCAL", "big", 0, "#00A4DC", "#07111f");
  if (mode === "source") return makeTile(state.lastSource ? "SRC" : "NO", "SOURCE", state.lastSource ? state.lastSource.split(":").pop() : "", "big", 0, state.lastSource ? "#00cc66" : "#ffaa00", state.lastSource ? "#06150d" : "#221800");
  if (mode === "raw") return makeTile(String(state.rawPacketCount), "RAW", "pkts", "big", 0, state.rawPacketCount > 0 ? "#00cc66" : "#ffaa00", state.rawPacketCount > 0 ? "#06150d" : "#221800");
  if (mode === "active") return makeTile(state.udpBound ? "ON" : "OFF", "UDP", state.udpBound ? "23666" : "", "alert", 0, state.udpBound ? "#00cc66" : "#ffaa00", state.udpBound ? "#06150d" : "#221800");
  if (!state.connected) return makeTile("NO", "DATA", "", "alert", 0, "#ffaa00", "#1b1200");
  return makeTile(String(state.packetRate), "PACKETS", "/s", "big", 0, state.packetRate > 0 ? "#00cc66" : "#ffaa00", state.packetRate > 0 ? "#06150d" : "#221800");
}

function resetSessionStats() {
  state.maxSpeed = 0;
  state.maxBoostBar = 0;
  state.maxPowerHp = 0;
  state.zeroToHundredBest = null;
  for (const [context, ctx] of contexts) {
    if (ctx.action === ACTIONS.SESSION) {
      ctx.lastImageKey = "";
      renderContext(context, true);
    }
  }
}

function makeTile(big, small, unit, mode, percent, accent, bg) {
  return { big, small, unit, mode, percent: clamp(percent || 0, 0, 100), accent, bg };
}

function makeImage(tile, themeName) {
  const theme = resolveTheme(themeName, tile);
  const big = escapeXml(tile.big);
  const small = escapeXml(tile.small);
  const unit = escapeXml(tile.unit || "");
  const fontSize = fontSizeFor(big);
  const barWidth = Math.round((tile.percent / 100) * 108);
  const gauge = tile.mode === "gauge" ? `<rect x="18" y="119" width="108" height="8" rx="4" fill="rgba(255,255,255,0.14)"/><rect x="18" y="119" width="${barWidth}" height="8" rx="4" fill="${theme.accent}"/>` : "";

  const svg = `
<svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">
  <rect width="144" height="144" rx="22" fill="${theme.bg}"/>
  <rect x="5" y="5" width="134" height="134" rx="18" fill="none" stroke="${theme.accent}" stroke-width="7"/>
  <rect x="14" y="14" width="116" height="116" rx="12" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
  <text x="72" y="28" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="900" fill="${theme.muted}">${small}</text>
  <text x="72" y="73" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="900" fill="${theme.accent}">${big}</text>
  <text x="72" y="108" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="900" fill="${theme.text}">${unit}</text>
  ${gauge}
</svg>`;

  return "data:image/svg+xml;charset=utf8," + encodeURIComponent(svg);
}

function resolveTheme(themeName, tile) {
  if (themeName === "minimal") return { bg: "#050505", accent: tile.accent || "#ffffff", text: "#ffffff", muted: "#cccccc" };
  if (themeName === "redline") return { bg: tile.bg || "#160000", accent: tile.accent || "#ff3333", text: "#ffffff", muted: "#dddddd" };
  return { bg: tile.bg || "#07111f", accent: tile.accent || "#00A4DC", text: "#ffffff", muted: "#d8f6ff" };
}

function fontSizeFor(text) {
  text = String(text);
  if (text.length <= 1) return 72;
  if (text.length <= 3) return 54;
  if (text.length <= 4) return 44;
  if (text.length <= 6) return 32;
  return 24;
}

function carClassName(value) {
  const map = { 0: "D", 1: "C", 2: "B", 3: "A", 4: "S1", 5: "S2", 6: "X" };
  return map[value] || String(value);
}

function send(obj) {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
  websocket.send(JSON.stringify(obj));
}

function log(message) {
  console.log(message);
  send({ event: "logMessage", payload: { message: String(message) } });
}

function clearTitle(context) {
  send({ event: "setTitle", context, payload: { title: "", target: 0 } });
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function safeNumber(value) { return Number.isFinite(value) ? value : 0; }
function round(value, digits) { const m = Math.pow(10, digits); return Math.round(value * m) / m; }

connectStreamDock();

function shutdown() {
  stopRuntime(true);
}

process.on("SIGINT", () => { shutdown(); process.exit(0); });
process.on("SIGTERM", () => { shutdown(); process.exit(0); });
process.on("beforeExit", shutdown);
