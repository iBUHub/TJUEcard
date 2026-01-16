import requests
import random
import logging
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

BASE_DOMAIN = "http://59.67.37.10:8180"
LOGIN_PAGE_URL = f"{BASE_DOMAIN}/epay/person/index"
LOGIN_URL = f"{BASE_DOMAIN}/epay/j_spring_security_check"
QUERY_URL = f"{BASE_DOMAIN}/epay/electric/queryelectricbill"
LOAD_BILL_URL = f"{BASE_DOMAIN}/epay/electric/load4electricbill"

class CampusSessionPool:
    def __init__(self, accounts):
        self.accounts = accounts
        self.sessions = [] # List of {'session': s, 'user': u, 'pass': p}

    def init_sessions(self):
        for acc in self.accounts:
            self.add_session(acc['username'], acc['password'])

    def add_session(self, username, password):
        s = requests.Session()
        s.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "X-Requested-With": "XMLHttpRequest",
        })
        if self._perform_login(s, username, password):
            self.sessions.append({'session': s, 'username': username, 'password': password})
            logger.info(f"Account {username} logged in successfully.")
        else:
            logger.error(f"Account {username} failed to login.")

    def _perform_login(self, session, username, password):
        try:
            # 1. Get CSRF
            page_resp = session.get(LOGIN_PAGE_URL, timeout=10)
            soup = BeautifulSoup(page_resp.text, 'html.parser')
            csrf_input = soup.find('input', {'name': '_csrf'})
            if not csrf_input:
                return False
            csrf_token = csrf_input['value']
            
            # 2. Post Login
            login_data = {"j_username": username, "j_password": password, "_csrf": csrf_token}
            headers = {"Referer": LOGIN_PAGE_URL, "Origin": BASE_DOMAIN}
            resp = session.post(LOGIN_URL, data=login_data, headers=headers, timeout=10)
            
            if "<frameset" in resp.text:
                return True
            return False
        except Exception as e:
            logger.error(f"Login exception: {e}")
            return False

    def get_valid_session(self):
        if not self.sessions:
            return None
        return random.choice(self.sessions)

    def query_room(self, task):
        # task keys: system_id, area_id, building_id, floor_id, room_id
        entry = self.get_valid_session()
        if not entry:
            return {'success': False, 'message': 'No available sessions'}
        
        session = entry['session']
        
        try:
            # 1. Get Token for Query Page
            token_page_url = f"{LOAD_BILL_URL}?elcsysid={task['system_id']}"
            page_headers = {"Referer": BASE_DOMAIN} # Simplified
            page_resp = session.get(token_page_url, headers=page_headers, timeout=10)
            
            soup = BeautifulSoup(page_resp.text, 'html.parser')
            csrf_meta = soup.find('meta', {'name': '_csrf'})
            
            if not csrf_meta:
                # Session might be expired, try re-login
                logger.warning(f"Session expired for {entry['username']}, relogging...")
                if self._perform_login(session, entry['username'], entry['password']):
                    return self.query_room(task) # Retry once
                return {'success': False, 'message': 'Session expired and relogin failed'}

            csrf_token = csrf_meta['content']
            
            # 2. Query
            payload = {
                "sysid": task['system_id'],
                "elcarea": task['area_id'],
                "elcbuis": task['building_id'],
                "elcfloor": task.get('floor_id', ''), # Some systems might not need floor? logic from original code used floor
                "roomNo": task['room_id']
            }
            # Original code used `roomNo` and `floor` from `selection`. 
            # Original Payload: sysid, elcarea, elcbuis, roomNo. (No floor in payload? Check original code)
            # Re-checking original code: 
            # query_payload = {"sysid": ..., "elcarea": ..., "elcbuis": ..., "roomNo": ...}
            # Wait, floor is not in payload? 
            # Original code line 268: query_payload = { ... } -> no floor.
            # But Room path printed involves floor.
            # So I should use the exact payload keys.
            
            real_payload = {
                "sysid": task['system_id'],
                "elcarea": task['area_id'],
                "elcbuis": task['building_id'],
                "roomNo": task['room_id'],
            }
            
            headers = {
                "X-CSRF-TOKEN": csrf_token,
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": token_page_url
            }
            
            resp = session.post(QUERY_URL, data=real_payload, headers=headers, timeout=10)
            result = resp.json()
            
            if result.get('retcode') == '0' or result.get('retcode') == 0:
                # Success
                elec = result.get('restElecDegree')
                if result.get('multiflag'):
                     elec = result.get('elecRoomData', [{}])[0].get('restElecDegree', 0)
                
                return {
                    'success': True,
                    'electricity': float(elec),
                    'message': 'Success'
                }
            else:
                return {
                    'success': False, 
                    'message': result.get('retmsg', 'Unknown Error')
                }

        except Exception as e:
            return {'success': False, 'message': str(e)}
