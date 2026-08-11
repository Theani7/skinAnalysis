with open('main_orig.py', 'r') as f:
    orig = f.read()

with open('main.py', 'r') as f:
    current = f.read()

import re

match = re.search(r'(app = FastAPI\([\s\S]*?)(?=@app\.get)', orig)
if match:
    app_block = match.group(1)
    current = current.replace('@app.get("/")', app_block + '\n@app.get("/")')
    with open('main.py', 'w') as f:
        f.write(current)

