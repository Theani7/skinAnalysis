import glob

for f_name in glob.glob('routers/*.py'):
    with open(f_name, 'r') as f:
        content = f.read()
    content = content.replace('IMAGE SERVING ROUTES (with path traversal protection)', '# IMAGE SERVING ROUTES (with path traversal protection)')
    content = content.replace('AUTH ROUTES', '# AUTH ROUTES')
    content = content.replace('PROTECTED CLINICAL ROUTES', '# PROTECTED CLINICAL ROUTES')
    content = content.replace('SAVED PRODUCTS', '# SAVED PRODUCTS')
    content = content.replace('REMOTE CAPTURE ROUTES', '# REMOTE CAPTURE ROUTES')
    content = content.replace('SCAN HISTORY ROUTES', '# SCAN HISTORY ROUTES')
    content = content.replace('PIGMENTATION PROGRESS & COMPARISON', '# PIGMENTATION PROGRESS & COMPARISON')

    with open(f_name, 'w') as f:
        f.write(content)
