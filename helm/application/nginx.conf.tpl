# Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

###
# Nginx Configuration Template for gRPC Studio Frontend
# This file is processed through Helm templating and mounted into the frontend container
###

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /tmp/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        application/atom+xml
        application/geo+json
        application/javascript
        application/x-javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rdf+xml
        application/rss+xml
        application/xhtml+xml
        application/xml
        font/eot
        font/otf
        font/ttf
        image/svg+xml
        text/css
        text/javascript
        text/plain
        text/xml;

    # Proxy settings
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_http_version 1.1;
    proxy_intercept_errors on;
    
    # Connection and retry settings for backend resilience
    proxy_connect_timeout 10s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
    proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
    proxy_next_upstream_tries 3;
    proxy_next_upstream_timeout 30s;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: ws: wss: data: blob: 'unsafe-inline'; frame-ancestors 'self';" always;

    server {
        listen {{ .Values.frontend.port }};
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        # Proxy API requests to backend (internal cluster call)
        # SECURITY: Backend is NOT exposed through VirtualService
        # All external traffic goes through frontend, which proxies to backend internally
        location /api/ {
            proxy_pass http://{{ include "grpc-studio.backendServiceName" . }}:{{ .Values.backend.port }}/api/;
            
            # Connection settings with retry logic
            proxy_connect_timeout 10s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
            
            # Retry on backend errors and connection failures
            proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
            proxy_next_upstream_tries 3;
            proxy_next_upstream_timeout 30s;
            
            # Handle CORS for API requests
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            
            # Handle preflight requests
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Max-Age' 1728000;
                add_header 'Content-Type' 'text/plain; charset=utf-8';
                add_header 'Content-Length' 0;
                return 204;
            }
        }

        # CRITICAL: Serve config files from external mount
        location /config/ {
            alias /config/;
            add_header Content-Type text/plain;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
            
            try_files $uri =503;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Enable gzip for static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            try_files $uri =404;
        }

        # Handle React Router (SPA)
        location / {
            try_files $uri $uri/ /index.html;
            
            # Cache control for HTML files
            location ~* \.html$ {
                expires -1;
                add_header Cache-Control "no-cache, no-store, must-revalidate";
                add_header Pragma "no-cache";
            }
        }

        # Security - deny access to hidden files
        location ~ /\. {
            deny all;
            access_log off;
            log_not_found off;
        }

        # Error pages
        error_page 404 /index.html;
        error_page 500 502 504 /index.html;
        
        # Special error page for missing config
        error_page 503 @config_missing;
        
        location @config_missing {
            return 503 '{"error": "Configuration file not found", "message": "Mount config/frontend.yaml as a volume"}';
            add_header Content-Type application/json;
        }
    }
}