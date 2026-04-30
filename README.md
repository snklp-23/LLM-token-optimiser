# LLM Token Optimizer

Middleware designed to intelligently optimize AI token usage. This system acts as a proxy between your user queries and Large Language Models, applying a suite of real-time optimizations to reduce prompt sizes, lower latency, and dramatically cut down (simulated or real) API costs, all while relying on local, privacy-preserving Ollama models.

## 🚀 How it Works (Deep Dive)

The system acts as a "smart detour" between the user and the final Large Language Model. Here is the exact end-to-end flow of how a prompt is optimized before it ever reaches the AI:

### 1. The Interception & Parallel Pipeline
When a user submits a prompt, it doesn't go straight to the LLM. It hits the backend Express server, which splits the request into **three independent optimization tasks running perfectly in parallel** (to ensure zero latency overhead):

* **Task A: Query Routing (The Fast Decision)**
  * **Logic:** Does this query actually require a massive, expensive LLM?
  * **Action:** It uses instantaneous Regex keyword matching (e.g., looking for words like `python`, `devops`, `aws`). If it finds technical keywords, it routes to the **expensive model** (`mistral`). If it doesn't, it assumes it's a general task and routes to the **cheap model** (`qwen2.5:1.5b`).
  
* **Task B: Tool Selection (The "Bouncer")**
  * **Logic:** LLMs consume hundreds of tokens just reading the definitions of tools they are allowed to use. 
  * **Action:** Instead of passing every tool blindly, it scans the prompt. If you ask about the "weather," it deletes the instruction schemas for the Calculator and Code Runner, keeping *only* the Weather tool. This shrinks the context drastically. *(Note: If the router picks the cheap model, this step strips ALL tools to ensure safety).*

* **Task C: Context Compression**
  * **Logic:** Infinite chat histories cause out-of-memory errors and massive API bills.
  * **Action:** If the conversation history is too long, a local LLM is quickly spun up to summarize older messages into a dense paragraph while keeping recent messages verbatim.

### 2. The Final LLM Call
Once the parallel pipeline finishes, the backend combines the results. It takes the **shrunken tool list**, the **summarized history**, and the **user's query**, and sends that lightweight package to the dynamically selected local Ollama model to generate the actual response.

### 3. Telemetry & Analytics
Before returning the response to the frontend, the backend calculates exactly how many tokens were saved and what the simulated monetary savings are. It records this data locally for the React dashboard, allowing users to see their real-time token savings and simulated cost avoidance.

## 🏗️ Architecture Diagram

```mermaid
graph TD
    User([User Client]) --> |User Query| API[Express API]
    
    subgraph Optimization Pipeline
        API --> |Parallel| Router[Query Router]
        API --> |Parallel| Tools[Tool Selector]
        API --> |Parallel| Compressor[Context Compressor]
        
        Router -.-> |Regex| FastLogic[Instant Heuristics]
        Tools -.-> |Keywords| FastLogic
    end
    
    FastLogic --> Assembler{Pipeline Merge}
    Compressor -.-> |Summarize History| Ollama[(Local Ollama)]
    Compressor --> Assembler
    
    Assembler --> |Optimized Prompt| Ollama
    Ollama --> |Text Response| API
    
    API --> |Savings Data| Dashboard[React Dashboard]
    API --> |Final Response| User
```

## 📂 Project Structure

This project is divided into a Node/Express backend and a React frontend:

- **`/backend`**: The core token optimization engine.
  - `src/optimizations/`: Contains the pipeline modules (`queryRouter.js`, `toolSelector.js`, `contextCompressor.js`).
  - `src/ollamaClient.js`: Local LLM integration handler.
  - `src/optimizationPipeline.js`: Orchestrates the parallel execution of the optimization steps.
  - `src/metricsStore.js` & `src/langfuseClient.js`: Telemetry and token usage tracking.
  - `src/server.js`: The Express API endpoints.
- **`/frontend`**: A React dashboard to interact with the optimizer and visualize savings.
  - `src/components/ChatPanel.js`: Chat interface with optimization toggles.
  - `src/components/MetricsPanel.js`: Live metrics on token savings and simulated costs.
  - `src/components/AnalyticsPanel.js`: Deep dive into token waterfall charts and system performance.

## ⚙️ Setup Instructions

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed.
- [Ollama](https://ollama.com/) installed and running locally.
- Pull the required Ollama models:
  ```bash
  ollama run mistral
  ollama run qwen2.5:1.5b
  ```

### 2. Environment Variables
You need to set up environment files in **both** the `frontend` and `backend` (and optionally the root directory):
- Navigate to the `frontend` directory, copy `.env.example` to `.env`.
- Navigate to the `backend` directory, copy `.env.example` to `.env`.
- **Note on API Keys**: Add your Langfuse or Gemini keys if you are using those integrations. If you want to use the maintainer's Langfuse keys, please request them, as they are not public in this repository. 

### 3. Running the App

**Start the Backend:**
```bash
cd backend
npm install
npm start
```
*The backend will run on `http://localhost:3001`.*

**Start the Frontend:**
```bash
cd frontend
npm install
npm start
```
*The frontend will run on `http://localhost:3000`.*
