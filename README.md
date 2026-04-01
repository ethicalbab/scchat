````markdown
# Q-Sec: Hybrid Quantum-Classical Cryptography

### Reinforcement Learning Enhanced Security Dashboard

This repository contains the multi-layered architecture for the **Hybrid Quantum-Classical Cryptography** project. It integrates a Python-based RL engine with a Deno-powered backend and a React frontend.

---

## 📂 Project Structure

- **/qsec-rl-engine**: Python environment containing the Actor-Critic Reinforcement Learning model (`main.py`).
- **/supabase/functions/message-crypto**: Deno Edge Functions handling the cryptographic logic (`index.ts`).
- **/src**: React/Vite frontend dashboard for real-time visualization.

---

## 🚀 Getting Started (Terminal Commands)

Follow these steps in order to get the full system running on your MacBook.

### 1. The RL Engine (Python)

Run the "brain" of the project to start the Actor-Critic weight calculations.

```bash
cd ~/Desktop/sechat/sechat/qsec-rl-engine
# Activate your virtual environment
source venv/bin/activate
# Run the engine
python3 main.py
```
````

### 2. The Crypto Backend (Deno)

Run the secure message-processing layer. Note: The entry point is `index.ts`.

```bash
cd ~/Desktop/sechat/sechat/supabase/functions/message-crypto
deno run --allow-net --allow-read index.ts
```

- **Local Endpoint:** `http://localhost:8888/`

### 3. The Frontend Dashboard (NPM)

Launch the Vite development server to view the UI.

```bash
cd ~/Desktop/sechat/sechat
npm run dev
```

---

## 🛠 Troubleshooting & Notes

- **Pathing:** Always ensure you are in the root `sechat` folder before running `npm run dev` to avoid alias errors (`@/components`).
- **File Names:** Use `index.ts` for the Deno function; `main.ts` was deprecated/moved.
- **Port 8888:** If the Deno server fails to start, ensure no other process is using port 8888.

---

## 📝 Git Description

> **Hybrid-Quantum-RL-Crypto:** A research-driven implementation of a Hybrid Quantum-Classical cryptography model. This project utilizes an Actor-Critic Reinforcement Learning engine to adaptively optimize security parameters, supported by a Deno-based edge backend and a React/Vite monitoring dashboard. Developed as a Capstone Project.

```

---

### Pro-Tip for your Project Review:
If you want to make this look even more professional for your panel, you can add a `Screenshot` section to this file and drop in a quick snap of your terminal running all three processes at once!

```
