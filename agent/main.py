import time
import requests
import logging
import json
import os
import pickle
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load .env file immediately (if present) to populate os.environ
load_dotenv()

# --- Constants ---
BASE_DOMAIN = "http://59.67.37.10:8180"  # Equivalent to https://ecard.tju.edu.cn
LOGIN_PAGE_URL = f"{BASE_DOMAIN}/epay/person/index"
LOGIN_URL = f"{BASE_DOMAIN}/epay/j_spring_security_check"
QUERY_URL = f"{BASE_DOMAIN}/epay/electric/queryelectricbill"
LOAD_BILL_URL = f"{BASE_DOMAIN}/epay/electric/load4electricbill"
VERIFY_LOGIN_URL = f"{BASE_DOMAIN}/epay/person/index" # Same as LOGIN_PAGE_URL
COOKIE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "agent_cookies.pkl")

# --- Utility Functions ---

def save_cookies(session: requests.Session, file_name: str) -> None:
    """
    Save session cookies to file
    
    :param session: Request session object
    :param file_name: File name to save to
    """
    with open(file_name, 'wb') as file:
        pickle.dump(session.cookies, file)
    logger.info(f"New session saved to {file_name}")


def load_cookies(session: requests.Session, file_name: str) -> bool:
    """
    Load cookies from file to session
    
    :param session: Request session object
    :param file_name: File name to load from
    :return: Whether loading was successful
    """
    if not os.path.exists(file_name):
        return False
    with open(file_name, 'rb') as file:
        session.cookies.update(pickle.load(file))
    logger.info("Session loaded from local file")
    return True


def extract_csrf_token(html_content: str) -> str | None:
    """
    Extract CSRF Token from HTML content
    
    :param html_content: HTML content
    :return: CSRF Token or None
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    csrf_meta_tag = soup.find('meta', {'name': '_csrf'})
    if csrf_meta_tag and csrf_meta_tag.has_attr('content'):
        return csrf_meta_tag['content']
    return None


def load_config(path=None):
    """
    Load configuration from environment variables only
    
    :return: Configuration dictionary
    """
    config = {
        'api_base_url': os.environ.get('API_BASE_URL', ''),
        'agent_secret': os.environ.get('AGENT_SECRET', ''),
        'accounts': []
    }

    if os.environ.get('ACCOUNTS_JSON'):
        try:
            config['accounts'] = json.loads(os.environ.get('ACCOUNTS_JSON'))
        except json.JSONDecodeError:
            logger.error("Failed to parse ACCOUNTS_JSON from environment")

    # Validate
    if not config['api_base_url']:
        logger.warning("API_BASE_URL is not set!")
        
    return config


# --- Core Query Functions ---

def perform_auto_login(session: requests.Session, username: str, password: str) -> bool:
    """
    Perform automatic login
    
    :param session: Request session object
    :param username: Username
    :param password: Password
    :return: Whether login was successful
    """
    logger.info("Attempting automatic re-login")
    try:
        page_response = session.get(LOGIN_PAGE_URL, timeout=10)
        page_response.raise_for_status()
        soup = BeautifulSoup(page_response.text, "html.parser")
        csrf_input_tag = soup.find("input", {"name": "_csrf"})
        if not csrf_input_tag or not csrf_input_tag.has_attr("value"):
            logger.error("CSRF token not found on login page")
            return False
        csrf_token = csrf_input_tag["value"]
    except requests.RequestException as e:
        logger.error(f"Failed to access login page: {e}")
        return False

    login_data = {"j_username": username, "j_password": password, "_csrf": csrf_token}
    try:
        headers = {"Referer": LOGIN_PAGE_URL, "Origin": BASE_DOMAIN}
        response = session.post(LOGIN_URL, data=login_data, headers=headers, timeout=10)
        response.raise_for_status()
        if "<frameset" not in response.text:
            logger.error("Login failed, server response does not contain expected content")
            return False
        logger.info("Automatic re-login successful")
        return True
    except requests.RequestException as e:
        logger.error(f"Login request failed: {e}")
        return False


def handle_relogin(session: requests.Session, username: str, password: str) -> bool:
    """
    Handle reconnection logic
    
    :param session: Request session object
    :param username: Username
    :param password: Password
    :return: Whether reconnection was successful
    """
    logger.info("Starting reconnection logic")
    
    if perform_auto_login(session, username, password):
        save_cookies(session, COOKIE_FILE)
        logger.info("Reconnection successful and new session saved")
        return True
    else:
        logger.error("Automatic re-login failed")
        return False


def verify_session(session: requests.Session) -> bool:
    """
    Verify if session is valid
    
    :param session: Request session object
    :return: Whether session is valid
    """
    logger.info("Validating session validity")
    try:
        verify_headers = session.headers.copy()
        if "X-Requested-With" in verify_headers:
            del verify_headers["X-Requested-With"]
        verify_response = session.get(VERIFY_LOGIN_URL, headers=verify_headers, timeout=10)
        verify_response.raise_for_status()
        if (
            "j_spring_security_check" not in verify_response.text
            and "j_username" not in verify_response.text
        ):
            logger.info("Session validation passed")
            return True
        else:
            logger.warning("Session has expired")
            return False
    except requests.RequestException as e:
        logger.warning(f"Session validation request failed: {e}")
        return False


def query_electricity(session: requests.Session, task: dict, username: str, password: str) -> dict:
    """
    Query electricity for a room with retry logic
    
    :param session: Request session object
    :param task: Task dictionary containing system_id, area_id, building_id, room_id
    :param username: Username for re-login if needed
    :param password: Password for re-login if needed
    :return: Result dictionary with success, electricity, and message
    """
    selected_sysid = task['system_id']
    token_page_url = f"{LOAD_BILL_URL}?elcsysid={selected_sysid}"
    query_payload = {
        "sysid": selected_sysid,
        "elcarea": task['area_id'],
        "elcbuis": task['building_id'],
        "roomNo": task['room_id'],
    }

    logger.info(f"Starting electricity query for room {task['room_id']}")

    for attempt in range(2):
        try:
            # Get CSRF Token
            page_headers = session.headers.copy()
            if "X-Requested-With" in page_headers:
                del page_headers["X-Requested-With"]
            page_headers["Referer"] = BASE_DOMAIN
            page_response = session.get(token_page_url, headers=page_headers, timeout=10)
            page_response.raise_for_status()
            final_csrf_token = extract_csrf_token(page_response.text)

            if not final_csrf_token:
                # Treat missing token as session expiry
                msg = "Unable to obtain CSRF Token required for query, possibly due to session expiry"
                logger.warning(msg)

                if attempt == 0:  # If first attempt, try reconnection
                    logger.info("Triggering automatic reconnection")
                    if handle_relogin(session, username, password):
                        logger.info("Reconnection successful, retrying query")
                        continue
                else:
                    logger.error("Still unable to obtain Token after retry")
                    return {'success': False, 'message': 'Unable to obtain CSRF token after retry'}

            # Execute Query
            query_headers = {
                "X-CSRF-TOKEN": final_csrf_token,
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": token_page_url,
            }
            query_response = session.post(QUERY_URL, data=query_payload, headers=query_headers, timeout=10)
            query_response.raise_for_status()
            result = query_response.json()

            # Display and log results
            if result.get("retcode") == 0 or result.get("retcode") == '0':
                if result.get("multiflag"):
                    # Multi-meter mode
                    logger.info("Query successful (multi-meter mode)")
                    elec = result.get("elecRoomData", [{}])[0].get("restElecDegree", 0)
                else:
                    # Single meter mode
                    remaining_electricity = result.get("restElecDegree")
                    elec = remaining_electricity
                    logger.info(f"Query successful! Remaining electricity: {remaining_electricity} kWh")

                return {
                    'success': True,
                    'electricity': float(elec),
                    'message': 'Success'
                }
            else:
                msg = f"Query failed: {result.get('retmsg')}"
                logger.error(msg)
                return {
                    'success': False,
                    'message': result.get('retmsg', 'Unknown error')
                }

        except (requests.RequestException, json.JSONDecodeError, Exception) as e:
            msg = f"Error occurred during query: {e}"
            logger.error(msg)
            if attempt == 0 and isinstance(e, requests.RequestException):
                logger.info("Network error, attempting reconnection")
                if handle_relogin(session, username, password):
                    logger.info("Reconnection successful, retrying query")
                    continue
            return {'success': False, 'message': str(e)}

    return {'success': False, 'message': 'Query failed after retries'}


# --- Agent Class ---

class Agent:
    def __init__(self, config):
        self.base_url = config['api_base_url']
        self.secret = config['agent_secret']
        self.accounts = config['accounts']
        self.session = None
        self.current_account = None
        
    def init_session(self):
        """Initialize session with first available account"""
        if not self.accounts:
            logger.error("No accounts configured")
            return False
            
        # Use first account for now (can be extended to support multiple accounts)
        self.current_account = self.accounts[0]
        
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "X-Requested-With": "XMLHttpRequest",
        })
        
        is_session_valid = False
        if load_cookies(self.session, COOKIE_FILE):
            logger.info("Loaded cookies from file, validating session")
            is_session_valid = verify_session(self.session)
        
        if not is_session_valid:
            logger.info("Session invalid or does not exist, attempting automatic login")
            if handle_relogin(self.session, self.current_account['username'], self.current_account['password']):
                is_session_valid = True
        
        return is_session_valid
        
    def poll(self):
        """Poll server for tasks"""
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
        """Submit task result to server"""
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
        """Main agent loop"""
        logger.info("Agent started")
        
        if not self.init_session():
            logger.error("Failed to initialize session, exiting")
            return
        
        while True:
            tasks = self.poll()
            if not tasks:
                logger.info("No tasks. Sleeping...")
                time.sleep(60)  # Sleep 60s
                continue
            
            logger.info(f"Received {len(tasks)} tasks")
            
            for task in tasks:
                logger.info(f"Processing Room {task['id']} ({task['room_id']})")
                
                # Execute Query using core query function
                result = query_electricity(
                    self.session, 
                    task, 
                    self.current_account['username'], 
                    self.current_account['password']
                )
                
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
