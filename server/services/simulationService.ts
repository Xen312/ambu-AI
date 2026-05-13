import { io } from "../sockets/index.js";
import { runAiWorkflow } from "../ai/n8nAgent.js";

// Available predefined routes
export const PREDEFINED_ROUTES = [
  {
    name: "Tiddim Road (Main Route)",
    path: [
      [24.817929,93.928037],[24.817792,93.927717],[24.817691,93.927278],[24.817688,93.927234],
      [24.817678,93.927096],[24.817712,93.926937],[24.817749,93.926768],[24.817758,93.92603],
      [24.817765,93.925497],[24.817691,93.925463],[24.817639,93.925396],[24.817618,93.925311],
      [24.817223,93.9253],[24.815754,93.92526],[24.814859,93.925269],[24.814517,93.925321],
      [24.814292,93.925399],[24.81391,93.925537],[24.813594,93.926309],[24.813573,93.926359],
      [24.813055,93.927623],[24.812734,93.928365],[24.812651,93.928557],[24.812152,93.929712],
    ] as [number, number][]
  },
  {
    name: "NH-2 (Alternative Route)",
    path: [
      [24.82,93.938196],[24.819265,93.938176],[24.819201,93.939199],[24.815324,93.93816],
      [24.8152,93.939159],[24.807398,93.93845],[24.802462,93.938568],[24.785387,93.918964],
      [24.786412,93.920016],[24.786733,93.919588],[24.787975,93.919481],[24.78797,93.919999]
    ] as [number, number][]
  }
];

const DEFAULT_ROUTE = PREDEFINED_ROUTES[0].path;

export interface SurroundingVehicle {
  plate: string;
  distanceMeters: number;
  alerted: boolean;
  responded: boolean;
  laneClearanceEta: number;
}

export interface SimulationState {
  isActive: boolean;

  ambulance: {
    id: string;
    location: [number, number];
    speed: number;
    progress: number;
    etaSeconds: number;
    etaDisplay: string;
  };

  route: [number, number][];

  obstruction: {
    active: boolean;
    location: [number, number] | null;

    severity:
      | "low"
      | "medium"
      | "high"
      | "critical";

    durationSecs: number;

    riskLevel: string;

    vehiclePlate?: string;

    surroundingVehicles?: SurroundingVehicle[];
  } | null;

  aiResult: {
    decision: string;
    action: string;
    confidence: number;
    corridorRequired: boolean;
    escalationRequired: boolean;
    summary?: string;
    flaggedPlate?: string;
    intentionalBlockage?: boolean;
  } | null;
}

let state: SimulationState = {
  isActive: false,

  ambulance: {
    id: "AMB-104",
    location: DEFAULT_ROUTE[0],
    speed: 0,
    progress: 0,
    etaSeconds: 0,
    etaDisplay: "--"
  },

  route: DEFAULT_ROUTE,

  obstruction: null,

  aiResult: null,
};

let simulationInterval: NodeJS.Timeout | null = null;

let pathIndex = 0;

let fraction = 0;

let obstructionTriggers: number[] = [];

let currentSpeed = 55;

let targetSpeed = 58;

function interpolatePosition(
  p1: [number, number],
  p2: [number, number],
  fraction: number
): [number, number] {

  return [
    p1[0] + (p2[0] - p1[0]) * fraction,
    p1[1] + (p2[1] - p1[1]) * fraction,
  ];
}

function calculateDistanceKm(
  p1: [number, number],
  p2: [number, number]
) {

  const dx = (p2[0] - p1[0]) * 111;

  const dy =
    (p2[1] - p1[1]) *
    111 *
    Math.cos(p1[0] * Math.PI / 180);

  return Math.sqrt(dx * dx + dy * dy);
}

function calculateRemainingDistance(
  route: [number, number][],
  currentIndex: number,
  currentPos: [number, number]
): number {

  if (currentIndex >= route.length - 1) {
    return 0;
  }

  let dist =
    calculateDistanceKm(
      currentPos,
      route[currentIndex + 1]
    );

  for (
    let i = currentIndex + 1;
    i < route.length - 1;
    i++
  ) {

    dist += calculateDistanceKm(
      route[i],
      route[i + 1]
    );
  }

  return dist;
}

function updateEta() {

  if (state.ambulance.speed <= 0) {
    return;
  }

  const remainingKm =
    calculateRemainingDistance(
      state.route,
      pathIndex,
      state.ambulance.location
    );

  const etaSeconds = Math.round(
    (remainingKm / state.ambulance.speed) * 3600
  );

  state.ambulance.etaSeconds = etaSeconds;

  if (etaSeconds < 60) {

    state.ambulance.etaDisplay =
      `${etaSeconds}s`;

  } else {

    const mins =
      Math.floor(etaSeconds / 60);

    const secs =
      etaSeconds % 60;

    state.ambulance.etaDisplay =
      `${mins}m ${secs}s`;
  }
}

function broadcastState() {

  if (io) {
    io.emit("simulation:update", state);
  }
}

function createSurroundingVehicles():
  SurroundingVehicle[] {

  return Array.from({
    length: 3 + Math.floor(Math.random() * 4)
  }).map(() => {

    return {
      plate:
        `MN-01-${String.fromCharCode(
          65 + Math.floor(Math.random() * 26)
        )}${String.fromCharCode(
          65 + Math.floor(Math.random() * 26)
        )}-${1000 + Math.floor(Math.random() * 9000)}`,

      distanceMeters:
        5 + Math.floor(Math.random() * 40),

      alerted: false,

      responded: false,

      laneClearanceEta:
        1 + Math.floor(Math.random() * 4),
    };
  });
}

function tick() {

  if (!state.isActive) {
    return;
  }

  // Handle congestion
  if (
    state.obstruction &&
    state.obstruction.active
  ) {

    state.obstruction.durationSecs -= 0.5;

    if (
      state.obstruction.surroundingVehicles
    ) {

      state.obstruction.surroundingVehicles =
        state.obstruction.surroundingVehicles.map(
          vehicle => {

            if (!vehicle.alerted) {
              vehicle.alerted = true;
            }

            if (
              vehicle.alerted &&
              !vehicle.responded &&
              Math.random() > 0.25
            ) {
              vehicle.responded = true;
            }

            if (vehicle.responded) {
              vehicle.laneClearanceEta -= 0.5;
            }

            return vehicle;
          }
        );
    }

    targetSpeed = 18 + Math.random() * 10;

    currentSpeed +=
      (targetSpeed - currentSpeed) * 0.18;

    currentSpeed =
      Math.max(
        12,
        Math.min(35, currentSpeed)
      );

    currentSpeed =
      Math.round(currentSpeed * 10) / 10;

    state.ambulance.speed = currentSpeed;

    if (
      state.obstruction.durationSecs <= 0
    ) {

      state.obstruction.active = false;

      state.obstruction.location = null;

      targetSpeed = 55;
    }

    updateEta();

    broadcastState();

    return;
  }

  // Smooth cruising speed
  if (Math.random() < 0.05) {
    targetSpeed = 52 + Math.random() * 8;
  }

  currentSpeed +=
    (targetSpeed - currentSpeed) * 0.1;

  currentSpeed =
    Math.max(
      48,
      Math.min(62, currentSpeed)
    );

  currentSpeed =
    Math.round(currentSpeed * 10) / 10;

  state.ambulance.speed = currentSpeed;

  // Tick = 500ms
  const distanceToMoveKm =
    state.ambulance.speed / 7200;

  let remainingDistanceKm =
    distanceToMoveKm;

  while (
    remainingDistanceKm > 0 &&
    pathIndex < state.route.length - 1
  ) {

    const p1 = state.route[pathIndex];

    const p2 = state.route[pathIndex + 1];

    const segmentLengthKm =
      calculateDistanceKm(p1, p2);

    const segmentRemainingKm =
      segmentLengthKm * (1 - fraction);

    // Spawn congestion zones
    if (fraction === 0) {

      const triggerIndex =
        obstructionTriggers.indexOf(pathIndex);

      if (triggerIndex !== -1) {

        obstructionTriggers.splice(
          triggerIndex,
          1
        );

        const severities: (
          | "low"
          | "medium"
          | "high"
          | "critical"
        )[] = [
          "low",
          "medium",
          "high",
          "critical"
        ];

        const riskLevels = [
          "Moderate Urban Congestion",
          "Dense Traffic Flow",
          "Crowded Junction",
          "Slow Emergency Lane Clearance"
        ];

        const randomIdx =
          Math.floor(
            Math.random() *
            severities.length
          );

        const surroundingVehicles =
          createSurroundingVehicles();

        const vehiclePlate =
          surroundingVehicles[0]?.plate;

        state.obstruction = {
          active: true,

          location:
            state.route[pathIndex],

          severity:
            severities[randomIdx],

          riskLevel:
            riskLevels[randomIdx],

          vehiclePlate,

          surroundingVehicles,

          durationSecs:
            2 + Math.floor(Math.random() * 2),
        };

        triggerAiWorkflow(
          state.obstruction
        );

        broadcastState();

        return;
      }
    }

    if (
      segmentLengthKm === 0 ||
      remainingDistanceKm <
      segmentRemainingKm
    ) {

      if (segmentLengthKm > 0) {

        fraction +=
          remainingDistanceKm /
          segmentLengthKm;

      } else {

        fraction = 1;
      }

      remainingDistanceKm = 0;

    } else {

      remainingDistanceKm -=
        segmentRemainingKm;

      fraction = 0;

      pathIndex++;
    }
  }

  // Route completed
  if (
    pathIndex >= state.route.length - 1
  ) {

    state.isActive = false;

    state.ambulance.speed = 0;

    state.ambulance.progress = 1;

    state.ambulance.etaDisplay =
      "ARRIVED";

    if (simulationInterval) {
      clearInterval(simulationInterval);
    }

    broadcastState();

    return;
  }

  // Update location
  const p1 = state.route[pathIndex];

  const p2 = state.route[pathIndex + 1];

  state.ambulance.location =
    interpolatePosition(
      p1,
      p2,
      fraction
    );

  state.ambulance.progress =
    (pathIndex + fraction) /
    (state.route.length - 1);

  updateEta();

  broadcastState();
}

export function startSimulation(
  routeIndex?: number
) {

  if (state.isActive) {
    return;
  }

  let chosenRoute:
    [number, number][] =
    PREDEFINED_ROUTES[0].path;

  if (
    routeIndex !== undefined &&
    PREDEFINED_ROUTES[routeIndex]
  ) {

    chosenRoute =
      PREDEFINED_ROUTES[routeIndex].path;

  } else {

    const routeOptions = [
      PREDEFINED_ROUTES[0].path,
      [...PREDEFINED_ROUTES[0].path].reverse(),
      PREDEFINED_ROUTES[1].path,
      [...PREDEFINED_ROUTES[1].path].reverse()
    ];

    chosenRoute =
      routeOptions[
        Math.floor(
          Math.random() *
          routeOptions.length
        )
      ];
  }

  // Short simulation
  chosenRoute =
    chosenRoute.slice(0, 15);

  currentSpeed = 55;

  targetSpeed = 58;

  state = {
    isActive: true,

    ambulance: {
      id:
        `AMB-${Math.floor(
          Math.random() * 900
        ) + 100}`,

      location: chosenRoute[0],

      speed: currentSpeed,

      progress: 0,

      etaSeconds: 0,

      etaDisplay: "Calculating..."
    },

    route: chosenRoute,

    obstruction: null,

    aiResult: null,
  };

  pathIndex = 0;

  fraction = 0;

  // EXACTLY 4 obstructions
  const numObstructions = 4;

  obstructionTriggers = [];

  while (
    obstructionTriggers.length <
    numObstructions
  ) {

    const idx =
      Math.floor(
        Math.random() *
        (chosenRoute.length - 2)
      ) + 1;

    if (
      !obstructionTriggers.includes(idx)
    ) {
      obstructionTriggers.push(idx);
    }
  }

  broadcastState();

  if (simulationInterval) {
    clearInterval(simulationInterval);
  }

  // 500ms tick
  simulationInterval =
    setInterval(tick, 500);
}

async function triggerAiWorkflow(
  obstruction: any
) {

  try {

    const aiResponse =
      await runAiWorkflow({

        location:
          obstruction.location,

        severity:
          obstruction.severity,

        riskLevel:
          obstruction.riskLevel,

        vehiclePlate:
          obstruction.vehiclePlate,

        surroundingVehicles:
          obstruction
            .surroundingVehicles
            ?.map((v: any) => ({
              plate: v.plate,
              distanceMeters:
                v.distanceMeters,
              alerted: v.alerted,
              responded: v.responded,
            })) || [],

        ambulanceId:
          state.ambulance.id,

        timestamp:
          new Date().toISOString()
      });

    state.aiResult = aiResponse;

    broadcastState();

  } catch (err) {

    console.error(
      "AI Workflow failed:",
      err
    );
  }
}

export function pauseSimulation() {

  if (
    state.isActive &&
    simulationInterval
  ) {

    clearInterval(simulationInterval);

    state.isActive = false;

    broadcastState();
  }
}

export function resumeSimulation() {

  if (
    !state.isActive &&
    state.ambulance.progress < 1
  ) {

    state.isActive = true;

    if (simulationInterval) {
      clearInterval(simulationInterval);
    }

    simulationInterval =
      setInterval(tick, 500);

    broadcastState();
  }
}

export function resetSimulation() {

  if (simulationInterval) {
    clearInterval(simulationInterval);
  }

  state = {
    isActive: false,

    ambulance: {
      id: "AMB-104",

      location:
        DEFAULT_ROUTE[0],

      speed: 0,

      progress: 0,

      etaSeconds: 0,

      etaDisplay: "--"
    },

    route: DEFAULT_ROUTE,

    obstruction: null,

    aiResult: null,
  };

  pathIndex = 0;

  fraction = 0;

  obstructionTriggers = [];

  currentSpeed = 55;

  targetSpeed = 58;

  broadcastState();
}

export function getSimulationState() {
  return state;
}