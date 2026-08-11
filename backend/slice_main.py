with open('main.py', 'r') as f:
    lines = f.readlines()

new_main = "".join(lines[:234])  # Up to def root, health, etc.
new_main += "from routers import auth, users, products, scans, media\n"
new_main += "app.include_router(auth.router)\n"
new_main += "app.include_router(users.router)\n"
new_main += "app.include_router(products.router)\n"
new_main += "app.include_router(scans.router)\n"
new_main += "app.include_router(media.router)\n\n"

# Add the get_model_status back
new_main += "".join(lines[1080:1091])

# Add trailing if __name__ == "__main__":
new_main += "".join(lines[-4:])

with open('main.py', 'w') as f:
    f.write(new_main)
