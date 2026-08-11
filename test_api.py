import requests

try:
    resp = requests.get('http://localhost:8000/model/status')
    print("Model status:", resp.json())
    
    # We can't easily get a scan without auth, but we can check if the code in main.py has the changes.
except Exception as e:
    print(e)
