#!/bin/bash

# Script to force browser cache refresh
echo "🔄 Force refreshing CoFound CSS..."

# Add timestamp to messages.html to bypass cache
TIMESTAMP=$(date +%s)

# Open messages page with cache-busting parameter
open "file:///Users/jorgenhauger/Kodegreier/messages.html?v=$TIMESTAMP"

echo "✅ Opened messages.html with cache bypass"
echo ""
echo "📝 Instructions:"
echo "1. When the page opens, press Cmd+Shift+R (hard refresh)"
echo "2. Or press Cmd+Option+E to empty cache, then Cmd+R"
echo ""
echo "If that doesn't work:"
echo "• Close ALL browser tabs with CoFound"
echo "• Quit and restart your browser completely"
echo "• Open messages.html again"
