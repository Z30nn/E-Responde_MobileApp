# Free Routing API Alternatives (No Billing Required)

## Best Free Alternatives to Google Directions API

Here are routing services that provide road-following paths **completely free** with no credit card or billing required.

---

## 🏆 Option 1: OSRM (Open Source Routing Machine)

### **BEST OPTION - Completely Free, No Registration**

**Pros:**
- ✅ Completely free
- ✅ No API key required
- ✅ No registration needed
- ✅ Unlimited requests (be reasonable)
- ✅ Fast response times
- ✅ Open source

**Cons:**
- ⚠️ Public server can be slow during peak times
- ⚠️ No guaranteed SLA

### Implementation:

```typescript
const fetchRouteOSRM = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
) => {
  try {
    // OSRM Demo Server (Free, No Key Required)
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=polyline`;
    
    console.log('Fetching route from OSRM...');
    const response = await fetch(url);
    const result = await response.json();

    if (result.code === 'Ok' && result.routes.length > 0) {
      const route = result.routes[0];
      
      // Decode polyline (same function as Google)
      const points = decodePolyline(route.geometry);
      
      // Get duration and distance
      const durationInMinutes = Math.ceil(route.duration / 60);
      const distanceInKm = parseFloat((route.distance / 1000).toFixed(2));
      
      return {
        coordinates: points,
        duration: durationInMinutes,
        distance: distanceInKm,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching OSRM route:', error);
    return null;
  }
};
```

**Server URL:** `https://router.project-osrm.org`

---

## 🥈 Option 2: OpenRouteService

### **Great Option - Free Tier, Requires Simple Registration**

**Pros:**
- ✅ 2,000 requests per day FREE
- ✅ No credit card required
- ✅ Fast and reliable
- ✅ Multiple routing profiles (car, bike, walk)
- ✅ Additional features (isochrones, geocoding)

**Cons:**
- ⚠️ Requires free account registration
- ⚠️ Limited to 2,000 requests/day

### Implementation:

```typescript
const fetchRouteOpenRoute = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
) => {
  try {
    const ORS_API_KEY = 'YOUR_FREE_ORS_KEY'; // Get from openrouteservice.org
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${originLng},${originLat}&end=${destLng},${destLat}`;
    
    console.log('Fetching route from OpenRouteService...');
    const response = await fetch(url);
    const result = await response.json();

    if (result.features && result.features[0]) {
      const route = result.features[0];
      const coordinates = route.geometry.coordinates;
      
      // Convert [lng, lat] to {latitude, longitude}
      const points = coordinates.map(([lng, lat]: number[]) => ({
        latitude: lat,
        longitude: lng,
      }));
      
      // Get duration and distance
      const durationInMinutes = Math.ceil(route.properties.segments[0].duration / 60);
      const distanceInKm = parseFloat((route.properties.segments[0].distance / 1000).toFixed(2));
      
      return {
        coordinates: points,
        duration: durationInMinutes,
        distance: distanceInKm,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching OpenRouteService route:', error);
    return null;
  }
};
```

**Sign up:** https://openrouteservice.org/dev/#/signup
**Free Tier:** 2,000 requests/day

---

## 🥉 Option 3: GraphHopper

### **Good Option - Free Tier Available**

**Pros:**
- ✅ 500 requests per day FREE
- ✅ Fast routing
- ✅ Multiple profiles

**Cons:**
- ⚠️ Requires registration
- ⚠️ Limited to 500 requests/day

### Implementation:

```typescript
const fetchRouteGraphHopper = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
) => {
  try {
    const GRAPHHOPPER_API_KEY = 'YOUR_FREE_KEY';
    const url = `https://graphhopper.com/api/1/route?point=${originLat},${originLng}&point=${destLat},${destLng}&vehicle=car&key=${GRAPHHOPPER_API_KEY}`;
    
    const response = await fetch(url);
    const result = await response.json();

    if (result.paths && result.paths[0]) {
      const path = result.paths[0];
      const points = decodePolyline(path.points);
      
      const durationInMinutes = Math.ceil(path.time / 60000);
      const distanceInKm = parseFloat((path.distance / 1000).toFixed(2));
      
      return {
        coordinates: points,
        duration: durationInMinutes,
        distance: distanceInKm,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching GraphHopper route:', error);
    return null;
  }
};
```

**Sign up:** https://www.graphhopper.com/
**Free Tier:** 500 requests/day

---

## 🌟 Recommended: OSRM Integration

Since OSRM requires **no API key** and is **completely free**, here's a complete implementation for your maps:

### Update `CrimeReportMap.tsx`:

```typescript
const fetchRoute = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
) => {
  try {
    // Use OSRM (Free, No API Key)
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=polyline`;
    
    const response = await fetch(url);
    const result = await response.json();

    if (result.code === 'Ok' && result.routes.length > 0) {
      const route = result.routes[0];
      const points = decodePolyline(route.geometry);
      setRouteCoordinates(points);

      // Get duration and distance
      const durationInMinutes = Math.ceil(route.duration / 60);
      const distanceInKm = parseFloat((route.distance / 1000).toFixed(2));
      
      setEta(durationInMinutes);
      setDistance(distanceInKm);
    } else {
      // Fallback to straight line
      console.warn('OSRM routing failed, using straight line');
      setRouteCoordinates([
        { latitude: originLat, longitude: originLng },
        { latitude: destLat, longitude: destLng },
      ]);
      
      const straightLineDistance = calculateDistance(originLat, originLng, destLat, destLng);
      setDistance(straightLineDistance);
      const estimatedMinutes = Math.ceil((straightLineDistance / 40) * 60);
      setEta(estimatedMinutes);
    }
  } catch (error) {
    console.error('Error fetching route:', error);
    
    // Fallback to straight line
    setRouteCoordinates([
      { latitude: originLat, longitude: originLng },
      { latitude: destLat, longitude: destLng },
    ]);
    
    const straightLineDistance = calculateDistance(originLat, originLng, destLat, destLng);
    setDistance(straightLineDistance);
    const estimatedMinutes = Math.ceil((straightLineDistance / 40) * 60);
    setEta(estimatedMinutes);
  }
};
```

### Update `components/police-crime-map/index.tsx`:

Same changes - replace Google Directions URL with OSRM URL.

---

## Comparison Table

| Service | Free Limit | API Key Required | Credit Card | Speed | Reliability |
|---------|-----------|------------------|-------------|-------|-------------|
| **OSRM** | Unlimited* | ❌ No | ❌ No | Fast | Good |
| **OpenRouteService** | 2,000/day | ✅ Yes | ❌ No | Fast | Excellent |
| **GraphHopper** | 500/day | ✅ Yes | ❌ No | Fast | Good |
| **Google Directions** | 2,500/day | ✅ Yes | ✅ Yes** | Very Fast | Excellent |

*Be reasonable with requests
**Billing must be enabled even for free tier

---

## My Recommendation

### For Your Capstone Project:

**Use OSRM** because:
1. ✅ Zero setup required
2. ✅ No API key needed
3. ✅ Works immediately
4. ✅ Completely free
5. ✅ No billing concerns
6. ✅ Perfect for demonstrations

### Implementation Steps:

1. I'll provide you the updated code files
2. Replace the Google API calls with OSRM
3. Test it - should work immediately!
4. Enjoy road-following routes for free 🎉

---

## Fair Use Policy

When using free public services like OSRM:
- ✅ Be reasonable with request frequency
- ✅ Cache routes when possible
- ✅ Don't hammer the server
- ✅ Consider donating to the project if heavily using

For your Capstone project, you'll be well within reasonable limits.

---

## Performance Tips

1. **Cache routes:** Store routes for 5-10 minutes
2. **Update threshold:** Only fetch new route if officer moves > 100 meters
3. **Increase interval:** Update every 10-15 seconds instead of 5
4. **Fallback gracefully:** Always have straight-line backup

---

## Want Me to Implement It?

I can update your maps to use **OSRM right now** - no API key needed, completely free, and will give you beautiful road-following paths!

Just say "yes" and I'll make the changes! 🚀

