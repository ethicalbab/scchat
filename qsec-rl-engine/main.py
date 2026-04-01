from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import torch.nn as nn
import torch.nn.functional as F

# 1. FINAL MODEL CLASS (Matches Capstone.ipynb exactly)
class RLAgent(nn.Module):
    def __init__(self, input_dim=6, action_dim=3):
        super(RLAgent, self).__init__()
        
        # 1. Shared Layers (256 units)
        # Matches shared_layers.0, .1, .4, .5, .8, .9 from your error log
        self.shared_layers = nn.ModuleDict({
            "0": nn.Linear(input_dim, 256),
            "1": nn.ReLU(),
            "4": nn.Linear(256, 256),
            "5": nn.ReLU(),
            "8": nn.Linear(256, 128), # Adjusted to 128 to feed into heads
            "9": nn.ReLU()
        })
        
        # 2. Actor Head (64 units)
        # Matches size mismatch: [64, 128]
        self.actor_hidden = nn.ModuleDict({
            "0": nn.Linear(128, 64),
            "3": nn.Linear(64, 64)
        })
        self.actor_output = nn.Linear(64, action_dim)
        
        # 3. Critic Head (64 units)
        # Matches size mismatch: [64, 128]
        self.critic_hidden = nn.ModuleDict({
            "0": nn.Linear(128, 64),
            "3": nn.Linear(64, 64)
        })
        self.critic_output = nn.Linear(64, 1)

    def forward(self, state):
        # Shared pass
        x = F.relu(self.shared_layers["0"](state))
        x = F.relu(self.shared_layers["4"](x))
        shared_out = F.relu(self.shared_layers["8"](x))
        
        # Actor pass
        a = F.relu(self.actor_hidden["0"](shared_out))
        a = F.relu(self.actor_hidden["3"](a))
        action_probs = F.softmax(self.actor_output(a), dim=-1)
        
        # Critic pass
        c = F.relu(self.critic_hidden["0"](shared_out))
        c = F.relu(self.critic_hidden["3"](c))
        state_value = self.critic_output(c)
        
        return action_probs, state_value
# 2. Initialize FastAPI [cite: 43]
app = FastAPI(title="Q-Sec AI Engine")

# Add CORS so your React/Supabase app can talk to this server [cite: 30, 41]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Load the Model with CUDA-to-CPU Mapping [cite: 70]
# 3. Load the Model with CUDA-to-CPU Mapping
model = RLAgent()
try:
    state_dict = torch.load(
        "actor_critic_weights.pth", 
        map_location=torch.device('cpu'), 
        weights_only=True
    )
    
    # ADD strict=False HERE to ignore the ReLU weight errors
    model.load_state_dict(state_dict, strict=False)
    
    model.eval() 
    print("✅ AI Model (RLAgent) successfully mapped and loaded.")
except Exception as e:
    print(f"❌ Error loading model: {e}")

class NetworkMetrics(BaseModel):
    threat_level: float
    latency: float
    cpu_load: float

# 4. Prediction Endpoint [cite: 32, 46]
@app.post("/predict_protocol")
async def predict_protocol(metrics: NetworkMetrics):
    try:
        # State MUST be 6 items long to match input_dim=6
        # [Threat, Latency, CPU, Placeholder1, Placeholder2, Placeholder3]
        state_data = [metrics.threat_level, metrics.latency, metrics.cpu_load, 0.0, 0.0, 0.0]
        state_tensor = torch.tensor([state_data], dtype=torch.float32)
        
        with torch.no_grad():
            action_probs, _ = model(state_tensor)
            best_action = torch.argmax(action_probs).item()
        
        protocol_map = {0: "classical", 1: "hybrid", 2: "quantum"}
        selected = protocol_map.get(best_action, "classical")
        
        return {
            "selected_protocol": selected, 
            "confidence": float(action_probs[0][best_action].item())
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)