import yaml
import time
import requests
import logging
from campus_api import CampusSessionPool

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

import os
import json

def load_config(path='config.yaml'):
    config = {}
    
    # Load from file if exists
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f) or {}

    # Override with Environment Variables
    if os.environ.get('API_BASE_URL'):
        config['api_base_url'] = os.environ.get('API_BASE_URL')
    
    if os.environ.get('AGENT_SECRET'):
        config['agent_secret'] = os.environ.get('AGENT_SECRET')
        
    # Accounts can be passed as JSON string in Env
    if os.environ.get('ACCOUNTS_JSON'):
        try:
            config['accounts'] = json.loads(os.environ.get('ACCOUNTS_JSON'))
        except json.JSONDecodeError:
            logger.error("Failed to parse ACCOUNTS_JSON from environment")

    # Validate
    if 'api_base_url' not in config:
        logger.warning("api_base_url not set in config or env")
    
    return config

class Agent:
    def __init__(self, config):
        self.base_url = config['api_base_url']
        self.secret = config['agent_secret']
        self.pool = CampusSessionPool(config['accounts'])
        
    def poll(self):
        try:
            headers = {'X-Agent-Secret': self.secret}
            resp = requests.post(f"{self.base_url}/agent/poll", headers=headers, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            return data.get('tasks', [])
        except Exception as e:
            logger.error(f"Failed to poll: {e}")
            return []

    def submit(self, room_id, success, electricity, message):
        try:
            headers = {'X-Agent-Secret': self.secret}
            payload = {
                'room_id': room_id,
                'success': success,
                'electricity': electricity,
                'message': message
            }
            requests.post(f"{self.base_url}/agent/submit", json=payload, headers=headers, timeout=10)
            logger.info(f"Submitted task for Room {room_id}: {success}")
        except Exception as e:
            logger.error(f"Failed to submit: {e}")

    def run(self):
        logger.info("Agent started.")
        self.pool.init_sessions()
        
        while True:
            tasks = self.poll()
            if not tasks:
                logger.info("No tasks. Sleeping...")
                time.sleep(60) # Sleep 60s
                continue
            
            logger.info(f"Received {len(tasks)} tasks.")
            
            for task in tasks:
                logger.info(f"Processing Room {task['id']} ({task['room_id']})")
                
                # Execute Query
                # Task has: system_id, area_id, building_id, floor_id, room_id
                result = self.pool.query_room(task)
                
                self.submit(
                    task['id'],
                    result['success'],
                    result.get('electricity'),
                    result.get('message')
                )
            
            time.sleep(5)

if __name__ == "__main__":
    config = load_config()
    agent = Agent(config)
    agent.run()
