#!/bin/bash

# Validate OpenAPI document using Mint CLI
# Based on: https://www.npmjs.com/package/mint

echo "🔍 Validating OpenAPI document..."

# Check if OpenAPI file exists
if [ ! -f "api-reference/openapi.json" ]; then
    echo "❌ OpenAPI file not found at api-reference/openapi.json"
    exit 1
fi

echo "📋 Checking OpenAPI specification compliance..."

# Install Mint CLI if not available
if ! npm list -g mint &> /dev/null; then
    echo "📦 Installing Mint CLI..."
    npm install -g mint
fi

# Validate OpenAPI document
echo "✅ Running OpenAPI validation..."
mint openapi-check api-reference/openapi.json

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 OpenAPI document is valid!"
    echo ""
    echo "📊 Document summary:"
    
    # Extract basic info
    echo "- OpenAPI Version: $(jq -r '.openapi' api-reference/openapi.json)"
    echo "- API Title: $(jq -r '.info.title' api-reference/openapi.json)"
    echo "- API Version: $(jq -r '.info.version' api-reference/openapi.json)"
    
    # Count endpoints
    echo "- Total Paths: $(jq '.paths | length' api-reference/openapi.json)"
    
    # Count tags
    echo "- Total Tags: $(jq '.tags | length' api-reference/openapi.json)"
    
    # List servers
    echo "- Servers:"
    jq -r '.servers[] | "  - \(.description): \(.url)"' api-reference/openapi.json
    
    # Check security schemes
    echo "- Security Schemes:"
    jq -r '.components.securitySchemes | keys[]' api-reference/openapi.json | sed 's/^/  - /'
    
    echo ""
    echo "🚀 Ready for Mintlify integration!"
    
else
    echo ""
    echo "❌ OpenAPI document validation failed!"
    echo "Please fix the issues above before proceeding."
    exit 1
fi 