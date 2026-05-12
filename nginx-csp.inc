# CampusGate: Vite/React + Tailwind (bundled CSS), Google Fonts, Supabase.
# If you enable OAuth (e.g. Google) via Supabase, add to connect-src / frame-src: https://accounts.google.com https://*.googleusercontent.com
# img-src / media-src avoid bare "https:" (ZAP 10055 CSP Wildcard Directive); list explicit hosts only.
# style-src-elem: bundled CSS + fonts + blob: (ChartStyle uses blob: stylesheets, not inline <style>).
# style-src-attr: 'unsafe-inline' for React style={{}} (e.g. Progress, Chart legend colors). Tighten later with nonces if needed.
# If you load images/media from other HTTPS origins (e.g. university CDN URLs), add them here.
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; script-src 'self'; style-src-elem 'self' https://fonts.googleapis.com blob:; style-src-attr 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self' https://*.supabase.co; object-src 'none'; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob: https://*.supabase.co; upgrade-insecure-requests" always;
# ZAP 10021: discourage MIME sniffing on script-like static types.
add_header X-Content-Type-Options "nosniff" always;
# Site isolation (ZAP passive 90004 / Spectre-related headers):
# - COEP credentialless is accepted by ZAP (unsafe-none is treated as invalid). Lighter than require-corp for SPAs that load cross-origin CORS resources (e.g. Supabase, fonts).
# - CORP + COOP satisfy the same rule’s CORP/COOP checks on HTML/XML documents without relying on baseline ignores.
add_header Cross-Origin-Resource-Policy "same-origin" always;
add_header Cross-Origin-Embedder-Policy "credentialless" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
# ZAP 10063 / passive scan: declare feature policy; tighten or relax origins as product needs (e.g. WebAuthn).
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), fullscreen=(self), publickey-credentials-get=(self)" always;
