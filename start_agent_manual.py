import os
import json
import logging

# Load .env file (if exists)
from dotenv import load_dotenv
load_dotenv()

# ====== CONFIGURATION ======
# Please enter your TJU office network account here
# Prioritize environment variables from .env
USERNAME = os.getenv("TJU_USERNAME", "YOUR_USERNAME_HERE")
PASSWORD = os.getenv("TJU_PASSWORD", "YOUR_PASSWORD_HERE")

# Backend server address
# Prioritize environment variables, otherwise fallback to default
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3000")
AGENT_SECRET = os.getenv("AGENT_SECRET", "dev-agent-secret") 

# Set environment variables for Agent usage
accounts = [{"username": USERNAME, "password": PASSWORD}]
os.environ["ACCOUNTS_JSON"] = json.dumps(accounts)
# Ensure values are overwritten to the final decision (prevent mess up from repeated loading in main.py)
os.environ["API_BASE_URL"] = API_BASE_URL
os.environ["AGENT_SECRET"] = AGENT_SECRET

# Import and run Agent
try:
    print(f"[INFO] Starting Agent...")
    print(f"Target Server: {API_BASE_URL}")
    print(f"User: {USERNAME}")
    
    import sys
    # Add current directory to sys.path to ensure 'agent' module can be found
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.append(current_dir)

    from agent.main import Agent, load_config
    
    config = load_config()
    agent = Agent(config)
    agent.run()
except ImportError as e:
    import traceback
    print(f"[ERROR] Import failed: {e}")
    traceback.print_exc()
except Exception as e:
    import traceback
    print(f"[ERROR] {e}")
    traceback.print_exc()
