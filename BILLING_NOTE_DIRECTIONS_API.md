# Google Directions API - Billing Required

## ⚠️ Important Note

The Google Directions API requires **billing to be enabled** in Google Cloud Console, even to use the free tier.

---

## Free Tier Details

Even though billing must be enabled, you get significant free usage:

- **$200 free credit per month** (for new accounts)
- **2,500 Directions API requests per day = FREE**
- After 2,500 requests: **$5 per 1,000 additional requests**

### Cost Example:
- If you make 5,000 requests/day:
  - First 2,500 = FREE
  - Next 2,500 = $12.50
  - Monthly cost = ~$375 (if sustained every day)

---

## Current Implementation

The app currently uses **straight-line paths** as a fallback, which:
- ✅ Works without any API costs
- ✅ Shows distance and ETA (estimated)
- ✅ Displays routes between officers and crime locations
- ❌ Doesn't follow roads exactly

---

## If You Want Road-Following Paths

### Option 1: Enable Google Billing (Recommended)
1. Go to Google Cloud Console
2. Enable billing (requires credit card)
3. Stay within 2,500 requests/day = FREE
4. Monitor usage to avoid unexpected charges

### Option 2: Use Alternative Free APIs

#### OpenRouteService (Free, No Billing)
- 2,000 requests/day FREE
- No credit card required
- Sign up: https://openrouteservice.org/

#### Mapbox (Free Tier Available)
- 100,000 requests/month FREE
- Requires account
- Sign up: https://www.mapbox.com/

---

## Current App Behavior

**Without Directions API enabled:**
- ✅ Shows straight lines between points
- ✅ Calculates straight-line distance
- ✅ Estimates ETA based on average speed (40 km/h)
- ✅ All other features work perfectly

**With Directions API enabled:**
- ✅ Shows curved paths following roads
- ✅ Accurate driving distance
- ✅ Accurate driving time based on route
- ⚠️ Requires billing enabled

---

## Recommendation

For a **Capstone project**, the straight-line implementation is perfectly acceptable:
- Demonstrates the concept
- Shows real-time tracking
- Provides distance and ETA
- No billing/cost concerns
- All core features work

If you need road-following paths for your presentation or demo, you can:
1. Enable billing (you won't exceed free tier in testing)
2. Use it only during demo/presentation
3. Disable after project completion

---

## Summary

✅ **Current implementation works great without billing**
✅ Straight lines are sufficient for demonstration
✅ ETA and distance calculations work
⚠️ Road-following paths require Google billing to be enabled

**For your Capstone project, the current implementation is recommended unless road-following paths are specifically required.**

