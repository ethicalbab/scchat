# 🛡️ Q-Sec: Hybrid Quantum-Classical Cryptography

### Reinforcement Learning Enhanced Security Dashboard

This repository contains the multi-layered architecture for the **Hybrid Quantum-Classical Cryptography** project. It integrates a Python-based RL engine with a Deno-powered backend and a React frontend.

---

## 📂 Project Structure

- **`/qsec-rl-engine`**: Python environment with the Actor-Critic RL model (`main.py`).
- **`/supabase/functions/message-crypto`**: Deno Edge Functions for crypto logic (`index.ts`).
- **`/src`**: React/Vite frontend dashboard for real-time visualization.

---

## 🚀 Getting Started (Terminal Commands)

Follow these steps in order to get the full system running on your MacBook.

### 1. The RL Engine (Python)

Run the "brain" to start the Actor-Critic weight calculations.
**Command:** `cd ~/Desktop/sechat/sechat/qsec-rl-engine && source venv/bin/activate && python3 main.py`

### 2. The Crypto Backend (Deno)

Run the secure message-processing layer.
**Command:** `cd ~/Desktop/sechat/sechat/supabase/functions/message-crypto && deno run --allow-net --allow-read index.ts`

- **Local Endpoint:** http://localhost:8888/

### 3. The Frontend Dashboard (NPM)

Launch the Vite development server to view the UI. **Run this from the root folder.**
**Command:** `cd ~/Desktop/sechat/sechat && npm run dev`

---

## 🛠 Troubleshooting & Notes

- **Pathing:** Always run `npm run dev` from the `sechat/sechat` folder. Running it from inside `src` will cause `@/components` import errors.
- **Deno File:** Use `index.ts`. Your logs confirmed `main.ts` does not exist in this directory.
- **Typo Alert:** If you get "No such directory," check if you typed `scchat` instead of `sechat`.

---
