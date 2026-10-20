# serve.py
"""
I will run this file so make a local testing like 
Github Page offers for us
"""

import http.server
import os
import socket

PORT = 5500

def get_local_ip():
    """Finds the local network IP assigned by your mobile hotspot/Wi-Fi."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not actually send data; used to determine outgoing interface IP
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Separate the path from query params (e.g., /faq?ref=nav)
        parts = self.path.split('?', 1)
        clean_path = parts[0].rstrip('/')
        query_string = f"?{parts[1]}" if len(parts) > 1 else ""

        # If it's not the root path and has no extension (like .css, .js, .png)
        if clean_path and not os.path.splitext(clean_path)[1]:
            # Convert /faq to faq.html
            local_file = clean_path.lstrip('/') + '.html'
            if os.path.isfile(local_file):
                self.path = '/' + local_file + query_string

        return super().do_GET()

if __name__ == '__main__':
    # Binding to "0.0.0.0" makes the server accessible across the local network
    server_address = ('0.0.0.0', PORT)
    httpd = http.server.HTTPServer(server_address, CleanURLHandler)
    
    local_ip = get_local_ip()
    
    print("=" * 55)
    print(" 🚀 Python Clean-URL Server is Running!")
    print("=" * 55)
    print(f" 💻 On this computer:        http://localhost:{PORT}")
    print(f" 📱 Mobile Hotspot / Phone:   http://{local_ip}:{PORT}")
    print("=" * 55)
    print(" Press Ctrl + C to stop the server.\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped.")