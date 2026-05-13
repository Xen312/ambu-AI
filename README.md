# Ambulance Priority Enforcement System

An AI-powered emergency traffic coordination platform simulating a live ambulance tracking scenario in Imphal, Manipur. Built for hackathon demonstrations.

## Features
- **Live Imphal Map:** Real-time marker updating showing ambulance progress along a generated route.
- **Random Obstructions:** Periodic localized obstructions randomly affect speed and route viability.
- **N8N AI Agent Integration:** Simulates calling an AI Agent when obstructions appear. The agent returns JSON responses to dictate if a green corridor and law enforcement escalation is needed.
- **Clean UI:** A minimal, dark, data-dense interface designed to be understood in <5 seconds.

## Local Setup

### 1. Configure Secrets
Ensure you have set the `GEMINI_API_KEY` environment variable in your `.env` file since this simulates the N8N payload evaluator.

\`\`\`sh
GEMINI_API_KEY=your_key_here
\`\`\`

### 2. Install Packages
\`\`\`sh
npm install
\`\`\`

### 3. Run Development Server
\`\`\`sh
npm run dev
\`\`\`

The app will compile the Express backend which seamlessly serves the React frontend via Vite Middleware. 

## Testing the System
1. Open the UI.
2. Click **Start Simulation**.
3. Watch the ambulance tracker navigate the map.
4. When an obstruction is encountered, wait 2-3 seconds for the N8N AI Agent panel to populate its routing recommendation.
5. The map and speed will update live based on the obstruction's severity.
