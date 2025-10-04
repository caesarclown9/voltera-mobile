#!/bin/bash

# Script to get SHA256 hash of SSL certificate for pinning
# Usage: ./get-certificate-hash.sh domain.com [port]

DOMAIN=$1
PORT=${2:-443}

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 domain.com [port]"
    echo "Example: $0 ocpp.evpower.kg 443"
    exit 1
fi

echo "Getting certificate hash for $DOMAIN:$PORT..."
echo ""

# Get the certificate and extract public key hash
HASH=$(echo -n | openssl s_client -connect "$DOMAIN:$PORT" 2>/dev/null | \
       openssl x509 -pubkey -noout | \
       openssl pkey -pubin -outform der | \
       openssl dgst -sha256 -binary | \
       openssl enc -base64)

if [ -z "$HASH" ]; then
    echo "Failed to get certificate hash. Check domain and port."
    exit 1
fi

echo "SHA256 Hash for $DOMAIN:"
echo "$HASH"
echo ""
echo "Add this to your certificate pinning configuration:"
echo ""
echo "iOS (Info.plist):"
echo "  <string>$HASH</string>"
echo ""
echo "Android (network_security_config.xml):"
echo "  <pin digest=\"SHA-256\">$HASH</pin>"
echo ""

# Also get intermediate certificate if available
echo "Getting intermediate certificate hash..."
INTERMEDIATE=$(echo -n | openssl s_client -showcerts -connect "$DOMAIN:$PORT" 2>/dev/null | \
               awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/ {if (++i > 1) print}' | \
               head -n -1 | \
               openssl x509 -pubkey -noout 2>/dev/null | \
               openssl pkey -pubin -outform der 2>/dev/null | \
               openssl dgst -sha256 -binary | \
               openssl enc -base64)

if [ ! -z "$INTERMEDIATE" ]; then
    echo "Intermediate certificate hash:"
    echo "$INTERMEDIATE"
    echo "(Consider adding as backup pin)"
fi