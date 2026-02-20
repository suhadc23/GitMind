# How to Get a Valid Gemini API Key

## Step 1: Visit Google AI Studio
Go to: **https://aistudio.google.com/app/apikey**

## Step 2: Sign In
- Sign in with your Google account
- Accept any terms of service if prompted

## Step 3: Create API Key
1. Click **"Create API key"** button
2. Choose:
   - **"Create API key in new project"** (recommended for testing)
   - Or select an existing Google Cloud project

3. Copy the API key that appears (starts with `AIza...`)

## Step 4: Update Your .env File
```bash
# Open .env file
nano .env

# Update this line:
GEMINI_API_KEY=your_new_api_key_here

# Save and exit (Ctrl+X, then Y, then Enter)
```

## Step 5: Test the API Key
```bash
# Run the test script
node test-gemini.mjs

# You should see at least one model working:
# ✓ gemini-pro - WORKS
```

## Step 6: Restart Your Dev Server
```bash
# Stop the current server (Ctrl+C)
# Start again
npm run dev
```

## Common Issues

### "API key not valid"
- Make sure you copied the entire key (should start with `AIza`)
- No spaces before or after the key in .env
- No quotes around the key

### "Quota exceeded"
- You've hit the free tier limit
- Wait 24 hours or upgrade to paid tier
- Check: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas

### "API not enabled"
- Visit: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
- Click "Enable API"
- Wait a few minutes for activation

## Working Models (as of 2024)

Once your API key is valid, these models should work:
- `gemini-pro` (recommended, stable)
- `gemini-1.5-pro-latest` (latest features)
- `gemini-1.5-flash` (faster, cheaper)

## Free Tier Limits

Google AI Studio free tier includes:
- 60 requests per minute
- 1,500 requests per day
- 1 million tokens per day

For more: https://ai.google.dev/pricing
