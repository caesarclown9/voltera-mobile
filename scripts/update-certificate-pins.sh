#!/bin/bash

# Certificate Pinning Hash Update Script
# Updates network_security_config.xml with current certificate hashes
#
# Usage: ./scripts/update-certificate-pins.sh

set -e

DOMAIN="ocpp.voltera.kg"
CONFIG_FILE="android/app/src/main/res/xml/network_security_config.xml"

echo "🔒 Certificate Pinning Hash Update"
echo "=================================="
echo ""
echo "Domain: $DOMAIN"
echo ""

# Get current certificate hash
echo "📡 Fetching current certificate..."
CURRENT_HASH=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | \
  openssl x509 -pubkey -noout 2>/dev/null | \
  openssl rsa -pubin -outform der 2>/dev/null | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64)

if [ -z "$CURRENT_HASH" ]; then
  echo "❌ Failed to fetch certificate hash"
  exit 1
fi

echo "✅ Current certificate hash: $CURRENT_HASH"
echo ""

# Get Let's Encrypt R12 backup hash (static)
BACKUP_HASH="SbqmW+BAJEQrrUnIU4uVF0v8P+uz0K3GpCQu2cl/AUo="
echo "✅ Backup hash (Let's Encrypt R12): $BACKUP_HASH"
echo ""

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Config file not found: $CONFIG_FILE"
  exit 1
fi

# Display current hashes in file
echo "📄 Current hashes in config:"
grep 'pin digest=' "$CONFIG_FILE" | sed 's/^[[:space:]]*/  /'
echo ""

# Ask for confirmation
read -p "Do you want to update the hashes? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

# Backup original file
cp "$CONFIG_FILE" "$CONFIG_FILE.backup"
echo "✅ Backed up config to: $CONFIG_FILE.backup"

# Update the file
# This is a simple replacement - adjust as needed for your config structure
sed -i.tmp "s|<pin digest=\"SHA-256\">.*</pin><!-- Current certificate hash|<pin digest=\"SHA-256\">$CURRENT_HASH</pin><!-- Current certificate hash|" "$CONFIG_FILE"
rm -f "$CONFIG_FILE.tmp"

echo "✅ Updated certificate hashes in $CONFIG_FILE"
echo ""
echo "📝 Next steps:"
echo "   1. Rebuild the Android app"
echo "   2. Test HTTPS connections to $DOMAIN"
echo "   3. Commit the changes"
echo ""
echo "🔄 Expiration reminder:"
echo "   - Current pin expires: 2026-01-01"
echo "   - Set calendar reminder to update before expiration!"
echo ""
echo "✅ Done!"
