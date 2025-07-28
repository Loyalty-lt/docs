# OpenAPI Documentation Scripts

This directory contains scripts for managing and improving our OpenAPI documentation integration with Mintlify.

## 📋 Current Setup Status

✅ **Working Correctly:**
- OpenAPI 3.0.0 specification with staging/production servers
- Bearer authentication (JWT) properly configured  
- Security schemes defined and applied globally
- OpenAPI file integrated in `docs.json`
- Manual MDX files with custom content and examples

## 🔧 Available Scripts

### `validate-openapi.sh`
Validates the OpenAPI document using Mint CLI and provides detailed information about the specification.

```bash
./scripts/validate-openapi.sh
```

**What it checks:**
- OpenAPI specification compliance
- Document structure and validity
- Provides summary statistics (paths, tags, servers, security)

### `generate-api-docs.sh`  
Auto-generates MDX files from OpenAPI specification using Mintlify scraper.

```bash
./scripts/generate-api-docs.sh
```

**What it does:**
- Uses `@mintlify/scraping` to generate MDX files
- Creates organized directory structure
- Provides guidance for file organization

## 🚀 Implementation Options

### Option 1: Current Approach (Manual MDX)
**Pros:**
- Full control over content and examples
- Custom Mintlify components (Steps, Tabs, Cards, etc.)
- Rich implementation examples and business logic
- Custom organization and cross-references

**Cons:**
- Manual maintenance required
- Need to update when OpenAPI changes

### Option 2: Auto-populated Pages
Switch to using `openapi` field in navigation groups for automatic page generation.

**Example configuration (`docs-auto.json`):**
```json
{
  "group": "Shop APIs (Auto-generated)",
  "openapi": {
    "source": "/api-reference/openapi.json",
    "directory": "api-reference/auto",
    "filter": {
      "tags": ["Authentication", "Shop Loyalty Cards", "Shop Points"]
    }
  }
}
```

### Option 3: Hybrid Approach (Recommended)
- Auto-generate base MDX files using scraper
- Manually enhance with custom content, examples, and Mintlify components
- Use frontmatter OpenAPI references for automatic API playground

**Example frontmatter:**
```yaml
---
title: "Generate QR Login Session"
description: "Generate QR code for cross-device authentication"
openapi: "/api-reference/openapi.json POST /{locale}/shop/auth/qr-login/generate"
---
```

## 📚 Best Practices from Mintlify

### 1. OpenAPI Document Structure
- ✅ Use OpenAPI 3.0+ specification
- ✅ Define `servers` for API playground functionality
- ✅ Configure `securitySchemes` and `security` for authentication
- ✅ Use descriptive `operationId` for endpoint identification
- ✅ Include comprehensive `tags` for organization

### 2. Authentication Configuration
```json
{
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Enter JWT token in format: Bearer {token}"
      }
    }
  },
  "security": [{"bearerAuth": []}]
}
```

### 3. Server Configuration
```json
{
  "servers": [
    {
      "url": "https://staging-api.loyalty.lt",
      "description": "Staging API Server"
    },
    {
      "url": "https://api.loyalty.lt", 
      "description": "Production API Server"
    }
  ]
}
```

## 🔄 Migration Strategies

### To Auto-populated Pages:
1. Update `docs.json` with `openapi` fields in navigation groups
2. Move existing MDX content to overview/guide pages
3. Test auto-generated API playground functionality

### To Hybrid Approach:
1. Run `generate-api-docs.sh` to create base MDX files
2. Enhance generated files with custom content
3. Use frontmatter OpenAPI references
4. Maintain custom examples and implementation guides

### To Enhanced Manual:
1. Continue with current approach
2. Add frontmatter OpenAPI references to existing files
3. Leverage automatic API playground generation
4. Keep rich custom content and examples

## 🔍 Validation and Testing

Run validation before deploying:

```bash
# Validate OpenAPI specification
./scripts/validate-openapi.sh

# Test Mintlify build (if Mintlify CLI is available)
mintlify dev

# Check for broken links and references
mintlify broken-links
```

## 📖 Additional Resources

- [Mintlify OpenAPI Integration Guide](https://mintlify.com/docs/api-playground/openapi)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/v3_0/)
- [Swagger Editor](https://editor.swagger.io/) for OpenAPI editing
- [Mintlify Scraper](https://www.npmjs.com/package/@mintlify/scraping) for auto-generation

## 🎯 Recommendations

For Loyalty.lt documentation, we recommend:

1. **Keep current manual approach** for main Shop/Partner API endpoints with rich examples
2. **Add frontmatter OpenAPI references** to enable automatic API playground
3. **Use auto-generation** for comprehensive internal/admin endpoints
4. **Validate regularly** using provided scripts
5. **Consider hybrid approach** for future endpoint additions 