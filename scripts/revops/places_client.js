// scripts/revops/places_client.js
// Tier 2 Ingestion: Google Places API (New) for real competitor data.

async function getCompetitorData(location, niche) {
  const apiKey = process.env.GOOGLE_PLACES_KEY || process.env.GOOGLE_PLACES_API;
  if (!apiKey) {
    console.warn("⚠️ GOOGLE_PLACES_KEY/GOOGLE_PLACES_API missing. Skipping Tier 2 competitor fetch.");
    return null;
  }

  // Construct a search query, e.g., "electrical wholesaler in Vereeniging"
  const searchQuery = `${niche} in ${location}`;

  try {
    console.log(`📡 Querying Google Places for competitors: "${searchQuery}"...`);
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // We only request the fields we need to keep latency low
        'X-Goog-FieldMask': 'places.displayName,places.rating,places.userRatingCount,places.formattedAddress'
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        // Optional: restrict to regions if needed, but the text query usually suffices
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.places && data.places.length > 0) {
      // Return the top 3 competitors
      return data.places.slice(0, 3).map(place => ({
        name: place.displayName?.text || "Unknown",
        rating: place.rating || 0,
        reviews: place.userRatingCount || 0,
        address: place.formattedAddress || "Unknown"
      }));
    }
    return null;
  } catch (error) {
    console.error(`❌ Google Places Integration Error: ${error.message}`);
    return null;
  }
}

module.exports = { getCompetitorData };
