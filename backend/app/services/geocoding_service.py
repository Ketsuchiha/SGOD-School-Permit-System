from geopy.geocoders import Nominatim
from typing import Optional, Dict

def geocode_address(address: str) -> Optional[Dict[str, float]]:
    """
    Geocodes a physical address into latitude and longitude using geopy.
    Specifically targets Cabuyao, Laguna context if possible.
    """
    
    # Initialize geolocator with a user agent
    geolocator = Nominatim(user_agent="deped-cabuyao-school-registry")
    
    # Add context to help narrow down to Cabuyao, Laguna
    query = address
    if "Laguna" not in address:
        query += ", Cabuyao, Laguna, Philippines"
        
    try:
        location = geolocator.geocode(query, timeout=10)
        if location:
            return {
                "lat": location.latitude,
                "lng": location.longitude
            }
        
        # Fallback to broader Cabuyao search if specific address fails
        if "Cabuyao" not in address:
            location = geolocator.geocode("Cabuyao, Laguna, Philippines")
            if location:
                return {
                    "lat": location.latitude,
                    "lng": location.longitude
                }
                
    except Exception:
        # Silently fail for geocoding and let the caller handle it
        return None
        
    return None
