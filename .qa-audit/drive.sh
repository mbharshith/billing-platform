#!/bin/bash
# QuickBill full-stack QA audit driver
# Drives agent-browser through every role x every viewport x every page
# and collects screenshots + inline findings.

set -euo pipefail
AB="$HOME/.wibey/skills/agent-browser/scripts/agent-browser-wrapper.sh"
BASE="http://localhost:4173"
OUT="/Users/h0r04ir/Billing/.qa-audit"
BROWSER_LOG="$OUT/findings/browser-console.log"

: > "$BROWSER_LOG"

# React-safe input clear + type helper.
react_type() {
  local sel="$1" val="$2"
  $AB eval "const i=document.querySelector('$sel');if(i){const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,'');i.dispatchEvent(new Event('input',{bubbles:true}));}" > /dev/null
  $AB type "$sel" "$val" > /dev/null
}

login_as() {
  local user="$1" pass="$2"
  $AB eval "localStorage.clear();sessionStorage.clear();" > /dev/null 2>&1 || true
  $AB open "$BASE/login" > /dev/null
  sleep 2
  react_type "#login-username" "$user"
  react_type "#login-password" "$pass"
  $AB click "button[type=submit]" > /dev/null
  sleep 3
}

# Snap a page across all three viewports.
# args: role viewport-name width height path label
snap() {
  local role="$1" vp="$2" w="$3" h="$4" path="$5" label="$6"
  $AB set viewport "$w" "$h" > /dev/null
  $AB open "$BASE$path" > /dev/null
  sleep 2
  local out="$OUT/$vp/${role}-${label}.png"
  $AB screenshot "$out" > /dev/null 2>&1 || true
  # Report the location
  local final; final=$($AB eval "location.pathname" 2>/dev/null | tr -d '"')
  echo "[$vp][$role] $label -> $final"
}

# 3-viewport snapshot for the current role, iterating over all pages.
snap_all_viewports() {
  local role="$1"; shift
  local specs=("$@")   # each spec = "path::label"
  for spec in "${specs[@]}"; do
    local path="${spec%%::*}" label="${spec##*::}"
    snap "$role" "desktop" 1440 900  "$path" "$label"
    snap "$role" "tablet"  768  1024 "$path" "$label"
    snap "$role" "mobile"  390  844  "$path" "$label"
  done
}

echo "=== VENDOR ==="
login_as "vendor" "vendor123"
snap_all_viewports "vendor" \
  "/vendor/dashboard::dashboard" \
  "/vendor/tenants::tenants" \
  "/vendor/audit::audit"

echo "=== ADMIN (flipkart) ==="
login_as "flipkart" "flipkart123"
snap_all_viewports "admin" \
  "/dashboard::dashboard" \
  "/cashier::cashier" \
  "/sales::sales" \
  "/customers::customers" \
  "/products::products" \
  "/users::users" \
  "/store::store"

echo "=== login screen ==="
$AB eval "localStorage.clear();sessionStorage.clear();" > /dev/null 2>&1 || true
snap_all_viewports "guest" "/login::login"

echo "=== DONE ==="
ls -lh "$OUT/desktop" "$OUT/tablet" "$OUT/mobile" | tail -30
