#!/bin/bash
# Script to add Stripe environment variables to Vercel
# Run this from the project root directory
# 
# This script reads values from .env file or prompts for them
# Make sure your .env file has the Stripe keys set

ENV_FILE=".env"
ENVIRONMENT="${1:-production}"

echo "Adding Stripe environment variables to Vercel ${ENVIRONMENT}..."
echo ""

# Function to get env var from .env file
get_env_var() {
    grep "^${1}=" "$ENV_FILE" 2>/dev/null | cut -d "=" -f2- | sed "s/^\"//;s/\"$//" | tr -d "\n"
}

# Function to prompt for value if not found
prompt_or_use_env() {
    local var_name=$1
    local value=$(get_env_var "$var_name")
    
    if [ -z "$value" ]; then
        echo "Enter ${var_name}:"
        read -s value
    fi
    
    echo "$value"
}

# Get values from .env or prompt
STRIPE_SECRET_KEY=$(prompt_or_use_env "STRIPE_SECRET_KEY")
STRIPE_PRODUCT_ID=$(prompt_or_use_env "STRIPE_PRODUCT_ID")
STRIPE_PRICE_ID=$(prompt_or_use_env "STRIPE_PRICE_ID")
STRIPE_PUBLISHABLE_KEY=$(prompt_or_use_env "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")
STRIPE_WEBHOOK_SECRET=$(prompt_or_use_env "STRIPE_WEBHOOK_SECRET")

# Add each environment variable
echo "$STRIPE_SECRET_KEY" | vercel env add STRIPE_SECRET_KEY "$ENVIRONMENT"
echo "$STRIPE_PRODUCT_ID" | vercel env add STRIPE_PRODUCT_ID "$ENVIRONMENT"
echo "$STRIPE_PRICE_ID" | vercel env add STRIPE_PRICE_ID "$ENVIRONMENT"
echo "$STRIPE_PUBLISHABLE_KEY" | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "$ENVIRONMENT"
echo "$STRIPE_WEBHOOK_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET "$ENVIRONMENT"

echo ""
echo "✅ All Stripe environment variables added to Vercel ${ENVIRONMENT}"
echo ""
echo "Usage: ./scripts/add-vercel-stripe-env.sh [production|preview|development]"
