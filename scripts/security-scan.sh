#!/bin/bash

# TruffleHog Security Scan Script
# This script handles the BASE/HEAD issue by scanning the entire repository

set -e

echo "🔍 Starting TruffleHog Security Scan..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Get current commit
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "📍 Current commit: $CURRENT_COMMIT"

# Check if there are any changes to scan
if [ "$1" = "--diff" ]; then
    # Scan only changes in the last commit
    PREVIOUS_COMMIT=$(git rev-parse HEAD~1 2>/dev/null || echo "")

    if [ -z "$PREVIOUS_COMMIT" ]; then
        echo "⚠️  No previous commit found, scanning entire repository"
        SCAN_MODE="filesystem /tmp"
    else
        echo "📍 Previous commit: $PREVIOUS_COMMIT"
        if [ "$CURRENT_COMMIT" = "$PREVIOUS_COMMIT" ]; then
            echo "⚠️  Current and previous commits are the same, scanning entire repository"
            SCAN_MODE="filesystem /tmp"
        else
            echo "✅ Scanning changes between commits"
            SCAN_MODE="git file://$(pwd) --since-commit $PREVIOUS_COMMIT --branch $CURRENT_COMMIT"
        fi
    fi
else
    # Scan entire repository
    echo "🔍 Scanning entire repository"
    SCAN_MODE="filesystem /tmp"
fi

# Run TruffleHog
echo "🚀 Running TruffleHog..."
docker run --rm -v "$(pwd):/tmp" -w /tmp \
    ghcr.io/trufflesecurity/trufflehog:latest \
    $SCAN_MODE \
    --debug \
    --only-verified \
    --fail

echo "✅ TruffleHog scan completed successfully!"
