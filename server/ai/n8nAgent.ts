import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

interface SurroundingVehicle {
  plate: string;
  distanceMeters: number;
  alerted: boolean;
  responded: boolean;
}

interface EmergencyEvent {
  location: [number, number];

  severity: string;

  riskLevel: string;

  ambulanceId: string;

  timestamp: string;

  vehiclePlate?: string;

  surroundingVehicles?: SurroundingVehicle[];
}

export async function runAiWorkflow(
  event: EmergencyEvent
) {

  // Calculate compliance metrics
  const totalVehicles =
    event.surroundingVehicles?.length || 0;

  const respondedVehicles =
    event.surroundingVehicles?.filter(
      vehicle => vehicle.responded
    ).length || 0;

  const complianceRate =
    totalVehicles > 0
      ? respondedVehicles / totalVehicles
      : 1;

  const likelyEnvironmentalCongestion =
  complianceRate > 0.6 &&
  totalVehicles >= 3;

  const forceNoIntentionalBlockage =
    likelyEnvironmentalCongestion;

  // Try user-provided n8n webhook first
  try {

    const webhookRes = await fetch(
      "https://xen312.app.n8n.cloud/webhook/emergency-event",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          ...event,
          complianceRate,
        })
      }
    );

    if (webhookRes.ok) {

      const data =
        await webhookRes.json();

      if (
        data &&
        (
          data.recommendedAction ||
          data.action ||
          data.decision
        )
      ) {

        return {
          severity:
            data.severity ||
            event.severity,

          recommendedAction:
            data.recommendedAction ||
            data.action ||
            data.decision,

          corridorRequired:
            data.corridorRequired ?? true,

          escalationRequired:
            data.escalationRequired ?? false,

          confidence:
            data.confidence ?? 95,

          summary:
            data.summary ||
            "Action provided by n8n workflow.",

          flaggedPlate:
            data.flaggedPlate ||
            event.vehiclePlate,

          intentionalBlockage:
            data.intentionalBlockage ?? false,

          complianceRate:
            data.complianceRate ??
            Math.round(complianceRate * 100),
        };
      }
    }

  } catch (err) {

    console.error(
      "Failed to notify n8n webhook or invalid response format:",
      err
    );

    // Continue to Gemini fallback
  }

  const prompt = `
You are an advanced emergency traffic coordination AI agent.

Your task is to analyze ambulance movement, surrounding traffic congestion, obstruction severity, emergency lane clearance, and vehicle compliance behavior.

EVENT DETAILS
-------------
Ambulance ID:
${event.ambulanceId}

Obstruction Severity:
${event.severity}

Risk Level:
${event.riskLevel}

Primary Vehicle Plate:
${event.vehiclePlate || "N/A"}

Location:
${event.location}

Timestamp:
${event.timestamp}

CURRENT COMPLIANCE RATE
-----------------------
${Math.round(complianceRate * 100)}%

If compliance rate is above 60%,
intentional blockage should almost never be flagged.

SURROUNDING VEHICLES
--------------------
${
  event.surroundingVehicles?.length
    ? event.surroundingVehicles
        .map(
          (vehicle, index) => `
Vehicle ${index + 1}
Plate: ${vehicle.plate}
Distance From Ambulance: ${vehicle.distanceMeters}m
Alert Sent: ${vehicle.alerted ? "YES" : "NO"}
Driver Responded: ${vehicle.responded ? "YES" : "NO"}
`
        )
        .join("\n")
    : "No surrounding vehicles detected."
}

IMPORTANT RULES FOR INTENTIONAL BLOCKAGE DETECTION
-------------------------------------------------
Do NOT classify normal congestion, crowded junctions,
slow-moving traffic, delayed driver reactions, or
dense urban traffic as intentional blockage.

Congestion alone is NOT malicious behavior.

Intentional blockage is RARE.

NEVER classify a single vehicle in dense traffic,
crowded intersections, slow-moving queues,
traffic bottlenecks, or emergency congestion as
intentional blockage by default.

A vehicle must satisfy MULTIPLE conditions before
intentional blockage can be considered.

Intentional blockage requires:
- Repeated non-response after multiple alerts
AND
- Very low surrounding traffic compliance
AND
- Clear evidence that traffic conditions alone
  cannot explain the obstruction
AND
- Persistent obstruction behavior over time

If only one vehicle appears delayed or stationary
inside heavy congestion, classify it as normal
traffic behavior, NOT malicious intent.

Dense traffic environments should strongly bias
toward NON-intentional classification.

If most surrounding vehicles are responding and traffic
density is high, classify the situation as environmental
congestion rather than intentional obstruction.

If surrounding vehicle count is high,
assume environmental congestion first.

Single vehicles inside dense traffic should
NOT be isolated as malicious actors.

TASKS
-----
1. Analyze congestion severity.

2. Determine whether a green corridor is required.

3. Estimate clearance difficulty.

4. Identify potentially non-compliant vehicles.

5. Predict escalation necessity.

6. Evaluate risk to patient transport.

7. Analyze overall compliance behavior.

8. Recommend immediate traffic-control actions.

9. Detect intentional obstruction ONLY if strong evidence exists.

10. Generate a concise operational summary.

IMPORTANT
---------
Return ONLY valid JSON.

Expected JSON schema:

{
  "severity": "string",
  "recommendedAction": "string",
  "corridorRequired": boolean,
  "escalationRequired": boolean,
  "confidence": number,
  "summary": "string",
  "flaggedPlate": "string or null",
  "intentionalBlockage": boolean,
  "complianceRate": number
}
`;

  try {

    // Lazy initialize Gemini client
    if (!ai) {

      const apiKey =
        process.env.GEMINI_API_KEY;

      if (
        !apiKey ||
        apiKey === "MY_GEMINI_API_KEY"
      ) {

        throw new Error(
          "Missing or invalid GEMINI_API_KEY environment variable."
        );
      }

      ai = new GoogleGenAI({
        apiKey
      });
    }

    const response =
      await ai.models.generateContent({

        model: "gemini-2.5-flash",

        contents: prompt,

        config: {

          responseMimeType:
            "application/json",

          responseSchema: {

            type: Type.OBJECT,

            properties: {

              severity: {
                type: Type.STRING
              },

              recommendedAction: {
                type: Type.STRING
              },

              corridorRequired: {
                type: Type.BOOLEAN
              },

              escalationRequired: {
                type: Type.BOOLEAN
              },

              confidence: {
                type: Type.INTEGER
              },

              summary: {
                type: Type.STRING
              },

              flaggedPlate: {
                type: Type.STRING,
                nullable: true
              },

              intentionalBlockage: {
                type: Type.BOOLEAN,
                nullable: true
              },

              complianceRate: {
                type: Type.NUMBER
              },
            },

            required: [
              "severity",
              "recommendedAction",
              "corridorRequired",
              "escalationRequired",
              "confidence",
              "summary",
              "complianceRate"
            ],
          },
        },
      });

    const resultText =
      response.text;

    if (resultText) {

      const parsed =
        JSON.parse(resultText);

      // Traffic-aware backend enforcement
      const heavyCongestion =
        totalVehicles >= 4;

      const highCompliance =
        complianceRate >= 0.6;

      const environmentalTraffic =
        heavyCongestion &&
        highCompliance;

      // Prevent false malicious escalation
      if (environmentalTraffic) {

        parsed.intentionalBlockage = false;

        parsed.escalationRequired = false;

        parsed.flaggedPlate = null;

        parsed.summary =
          "Heavy urban congestion detected. Surrounding vehicles are responding normally. No evidence of intentional obstruction.";

        parsed.recommendedAction =
          "Maintain adaptive emergency corridor and continue congestion management.";

        // Reduce certainty because congestion is noisy
        parsed.confidence =
          Math.min(
            parsed.confidence || 90,
            75
          );
      }

      return parsed;
    }

  } catch (error) {

    if (error instanceof Error) {

      console.error(
        "Gemini AI Warning:",
        error.message
      );

    } else {

      console.error(
        "Gemini AI Warning:",
        error
      );
    }

    // Fallback if Gemini fails
    return {

      severity:
        event.severity,

      recommendedAction:
        "Activate standard emergency traffic protocols. AI agent unavailable.",

      corridorRequired: true,

      escalationRequired: false,

      confidence: 0,

      complianceRate:
        Math.round(complianceRate * 100),

      intentionalBlockage: false,

      flaggedPlate: null,

      summary:
        "AI system offline. Traffic handled using default emergency routing rules.",
    };
  }
}