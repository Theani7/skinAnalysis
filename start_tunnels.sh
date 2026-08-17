#!/bin/bash

echo "Cleaning up old tunnels..."
killall cloudflared 2>/dev/null
sleep 1

echo "Starting backend tunnel..."
cloudflared tunnel --url http://localhost:8000 > backend-tunnel.log 2>&1 &

echo "Starting frontend tunnel..."
cloudflared tunnel --url http://localhost:3000 > frontend-tunnel.log 2>&1 &

# Function to extract URL with retry
get_tunnel_url() {
    local file=$1
    local url=""
    for i in {1..15}; do
        url=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$file" | head -n 1)
        if [ ! -z "$url" ]; then
            echo "$url"
            return 0
        fi
        sleep 1
    done
    return 1
}

echo "Waiting for URLs from Cloudflare..."
BACKEND_URL=$(get_tunnel_url backend-tunnel.log)
if [ -z "$BACKEND_URL" ]; then
    echo "Failed to get backend URL. Check backend-tunnel.log"
    exit 1
fi
echo "Backend URL: $BACKEND_URL"

FRONTEND_URL=$(get_tunnel_url frontend-tunnel.log)
if [ -z "$FRONTEND_URL" ]; then
    echo "Failed to get frontend URL. Check frontend-tunnel.log"
    exit 1
fi
echo "Frontend URL: $FRONTEND_URL"

# Update frontend .env
echo "VITE_API_URL=$BACKEND_URL" > frontend/.env
echo "✅ Updated frontend/.env"

# Update backend .env CORS
if grep -q "SKINAI_CORS_ORIGINS" backend/.env; then
    sed -i '' -E "s|(SKINAI_CORS_ORIGINS=.*)|\1,$FRONTEND_URL|g" backend/.env
else
    echo "SKINAI_CORS_ORIGINS=$FRONTEND_URL" >> backend/.env
fi
echo "✅ Updated backend CORS"

echo "----------------------------------------"
echo "🚀 Remote Tunnels are Ready!"
echo "📱 Open this link on your phone/computer:"
echo "👉 $FRONTEND_URL"
echo "----------------------------------------"
