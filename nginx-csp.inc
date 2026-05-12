# CampusGate: Vite/React + Tailwind (bundled CSS), Google Fonts, Supabase.
# If you enable OAuth (e.g. Google) via Supabase, add to connect-src / frame-src: https://accounts.google.com https://*.googleusercontent.com
# img-src / media-src avoid bare "https:" (ZAP 10055 CSP Wildcard Directive); list explicit hosts only.
# style-src-elem: bundled CSS + fonts + blob: (ChartStyle uses blob: stylesheets, not inline <style>).
# style-src-attr: 'unsafe-inline' for React style={{}} (e.g. Progress, Chart legend colors). Tighten later with nonces if needed.
# If you load images/media from other HTTPS origins (e.g. university CDN URLs), add them here.
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; script-src 'self'; style-src-elem 'self' https://fonts.googleapis.com blob:; style-src-attr 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self' https://*.supabase.co; object-src 'none'; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob: https://*.supabase.co; upgrade-insecure-requests" always;
# COEP: explicit policy clears DAST “header missing” (ZAP 90004). unsafe-none keeps default embedding rules so Supabase/fonts work.
# require-corp needs CORP on every cross-origin resource — avoid unless you are isolating for SharedArrayBuffer etc.
add_header Cross-Origin-Embedder-Policy "unsafe-none" always;
