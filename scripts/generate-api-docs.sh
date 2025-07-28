#!/bin/bash

# Auto-generate API documentation using Mintlify scraper
# Based on: https://www.npmjs.com/package/@mintlify/scraping

echo "🚀 Generating API documentation from OpenAPI spec..."

# Install Mintlify scraper if not installed
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js and npm."
    exit 1
fi

# Check if OpenAPI file exists
if [ ! -f "api-reference/openapi.json" ]; then
    echo "❌ OpenAPI file not found at api-reference/openapi.json"
    exit 1
fi

# Create output directories
mkdir -p api-reference/generated/shop
mkdir -p api-reference/generated/partner

echo "📝 Generating MDX files from OpenAPI specification..."

# Generate all API endpoints
npx @mintlify/scraping@latest openapi-file api-reference/openapi.json -o api-reference/generated

echo "✅ API documentation generated successfully!"

# Show generated files
echo "📁 Generated files:"
find api-reference/generated -name "*.mdx" | head -10

echo ""
echo "🔧 Next steps:"
echo "1. Review generated MDX files in api-reference/generated/"
echo "2. Move relevant files to appropriate directories:"
echo "   - Shop APIs: api-reference/endpoints/shop/"
echo "   - Partner APIs: api-reference/endpoints/partner/"
echo "3. Update docs.json navigation with new file paths"
echo "4. Customize MDX files as needed"

echo ""
echo "💡 Tips:"
echo "- Generated files use OpenAPI operationId as filename"
echo "- You can filter by tags using custom scripts"
echo "- Consider organizing by endpoint categories" 