# CampusGate: Vite/React bundle, MUI (inline styles), Google Fonts, Supabase API + Realtime.
# If you enable OAuth (e.g. Google) via Supabase, add to connect-src / frame-src: https://accounts.google.com https://*.googleusercontent.com
# img-src / media-src avoid bare "https:" (ZAP 10055 CSP Wildcard Directive); list explicit hosts only.
# If you load images/media from other HTTPS origins (e.g. university CDN URLs), add them here.
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self' https://*.supabase.co; object-src 'none'; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob: https://*.supabase.co; upgrade-insecure-requests" always;
