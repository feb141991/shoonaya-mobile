export interface CityRecord {
  city: string;
  label: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  aliases?: string[];
}

export const POPULAR_CITIES: CityRecord[] = [
  // Sacred & Pilgrimage Centers
  { city: 'Varanasi', label: 'Varanasi (Kashi / Banaras), Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 25.3176, lng: 82.9739, timezone: 'Asia/Kolkata', aliases: ['Kashi', 'Banaras', 'Benares'] },
  { city: 'Ayodhya', label: 'Ayodhya, Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 26.7922, lng: 82.1998, timezone: 'Asia/Kolkata', aliases: ['Saket', 'Faizabad'] },
  { city: 'Mathura', label: 'Mathura, Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 27.4924, lng: 77.6737, timezone: 'Asia/Kolkata', aliases: ['Braj'] },
  { city: 'Vrindavan', label: 'Vrindavan, Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 27.5806, lng: 77.7006, timezone: 'Asia/Kolkata', aliases: ['Brindavan'] },
  { city: 'Haridwar', label: 'Haridwar, Uttarakhand, India', state: 'Uttarakhand', country: 'India', lat: 29.9457, lng: 78.1642, timezone: 'Asia/Kolkata', aliases: ['Hardwar', 'Mayapuri'] },
  { city: 'Rishikesh', label: 'Rishikesh, Uttarakhand, India', state: 'Uttarakhand', country: 'India', lat: 30.0869, lng: 78.2676, timezone: 'Asia/Kolkata', aliases: ['Hrishikesh'] },
  { city: 'Ujjain', label: 'Ujjain, Madhya Pradesh, India', state: 'Madhya Pradesh', country: 'India', lat: 23.1765, lng: 75.7885, timezone: 'Asia/Kolkata', aliases: ['Avantika', 'Ujjayini'] },
  { city: 'Prayagraj', label: 'Prayagraj (Allahabad), Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 25.4358, lng: 81.8463, timezone: 'Asia/Kolkata', aliases: ['Allahabad', 'Prayag', 'Triveni'] },
  { city: 'Puri', label: 'Puri, Odisha, India', state: 'Odisha', country: 'India', lat: 19.8135, lng: 85.8312, timezone: 'Asia/Kolkata', aliases: ['Jagannath Puri'] },
  { city: 'Tirupati', label: 'Tirupati, Andhra Pradesh, India', state: 'Andhra Pradesh', country: 'India', lat: 13.6288, lng: 79.4192, timezone: 'Asia/Kolkata', aliases: ['Tirumala'] },
  { city: 'Rameswaram', label: 'Rameswaram, Tamil Nadu, India', state: 'Tamil Nadu', country: 'India', lat: 9.2876, lng: 79.3129, timezone: 'Asia/Kolkata', aliases: ['Rameshwaram'] },
  { city: 'Madurai', label: 'Madurai, Tamil Nadu, India', state: 'Tamil Nadu', country: 'India', lat: 9.9252, lng: 78.1198, timezone: 'Asia/Kolkata' },
  { city: 'Dwarka', label: 'Dwarka, Gujarat, India', state: 'Gujarat', country: 'India', lat: 22.2442, lng: 68.9685, timezone: 'Asia/Kolkata' },
  { city: 'Somnath', label: 'Somnath, Gujarat, India', state: 'Gujarat', country: 'India', lat: 20.8880, lng: 70.4012, timezone: 'Asia/Kolkata' },
  { city: 'Amritsar', label: 'Amritsar, Punjab, India', state: 'Punjab', country: 'India', lat: 31.6340, lng: 74.8723, timezone: 'Asia/Kolkata' },
  { city: 'Gaya', label: 'Gaya, Bihar, India', state: 'Bihar', country: 'India', lat: 24.7914, lng: 85.0002, timezone: 'Asia/Kolkata' },
  { city: 'Bodh Gaya', label: 'Bodh Gaya, Bihar, India', state: 'Bihar', country: 'India', lat: 24.6961, lng: 84.9869, timezone: 'Asia/Kolkata' },
  { city: 'Shirdi', label: 'Shirdi, Maharashtra, India', state: 'Maharashtra', country: 'India', lat: 19.7645, lng: 74.4762, timezone: 'Asia/Kolkata' },
  { city: 'Pushkar', label: 'Pushkar, Rajasthan, India', state: 'Rajasthan', country: 'India', lat: 26.4897, lng: 74.5511, timezone: 'Asia/Kolkata' },
  { city: 'Kurukshetra', label: 'Kurukshetra, Haryana, India', state: 'Haryana', country: 'India', lat: 29.9695, lng: 76.8783, timezone: 'Asia/Kolkata' },
  { city: 'Kedarnath', label: 'Kedarnath, Uttarakhand, India', state: 'Uttarakhand', country: 'India', lat: 30.7346, lng: 79.0669, timezone: 'Asia/Kolkata' },
  { city: 'Badrinath', label: 'Badrinath, Uttarakhand, India', state: 'Uttarakhand', country: 'India', lat: 30.7433, lng: 79.4938, timezone: 'Asia/Kolkata' },

  // Major Indian Metros & State Capitals
  { city: 'New Delhi', label: 'New Delhi, Delhi, India', state: 'Delhi', country: 'India', lat: 28.6139, lng: 77.2090, timezone: 'Asia/Kolkata', aliases: ['Delhi'] },
  { city: 'Mumbai', label: 'Mumbai, Maharashtra, India', state: 'Maharashtra', country: 'India', lat: 19.0760, lng: 72.8777, timezone: 'Asia/Kolkata', aliases: ['Bombay'] },
  { city: 'Bengaluru', label: 'Bengaluru, Karnataka, India', state: 'Karnataka', country: 'India', lat: 12.9716, lng: 77.5946, timezone: 'Asia/Kolkata', aliases: ['Bangalore'] },
  { city: 'Hyderabad', label: 'Hyderabad, Telangana, India', state: 'Telangana', country: 'India', lat: 17.3850, lng: 78.4867, timezone: 'Asia/Kolkata' },
  { city: 'Chennai', label: 'Chennai, Tamil Nadu, India', state: 'Tamil Nadu', country: 'India', lat: 13.0827, lng: 80.2707, timezone: 'Asia/Kolkata', aliases: ['Madras'] },
  { city: 'Kolkata', label: 'Kolkata, West Bengal, India', state: 'West Bengal', country: 'India', lat: 22.5726, lng: 88.3639, timezone: 'Asia/Kolkata' },
  { city: 'Ahmedabad', label: 'Ahmedabad, Gujarat, India', state: 'Gujarat', country: 'India', lat: 23.0225, lng: 72.5714, timezone: 'Asia/Kolkata' },
  { city: 'Pune', label: 'Pune, Maharashtra, India', state: 'Maharashtra', country: 'India', lat: 18.5204, lng: 73.8567, timezone: 'Asia/Kolkata' },
  { city: 'Jaipur', label: 'Jaipur, Rajasthan, India', state: 'Rajasthan', country: 'India', lat: 26.9124, lng: 75.7873, timezone: 'Asia/Kolkata' },
  { city: 'Surat', label: 'Surat, Gujarat, India', state: 'Gujarat', country: 'India', lat: 21.1702, lng: 72.8311, timezone: 'Asia/Kolkata' },
  { city: 'Lucknow', label: 'Lucknow, Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 26.8467, lng: 80.9462, timezone: 'Asia/Kolkata' },
  { city: 'Kanpur', label: 'Kanpur, Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 26.4499, lng: 80.3319, timezone: 'Asia/Kolkata' },
  { city: 'Nagpur', label: 'Nagpur, Maharashtra, India', state: 'Maharashtra', country: 'India', lat: 21.1458, lng: 79.0882, timezone: 'Asia/Kolkata' },
  { city: 'Indore', label: 'Indore, Madhya Pradesh, India', state: 'Madhya Pradesh', country: 'India', lat: 22.7196, lng: 75.8577, timezone: 'Asia/Kolkata' },
  { city: 'Thane', label: 'Thane, Maharashtra, India', state: 'Maharashtra', country: 'India', lat: 19.2183, lng: 72.9781, timezone: 'Asia/Kolkata' },
  { city: 'Bhopal', label: 'Bhopal, Madhya Pradesh, India', state: 'Madhya Pradesh', country: 'India', lat: 23.2599, lng: 77.4126, timezone: 'Asia/Kolkata' },
  { city: 'Visakhapatnam', label: 'Visakhapatnam, Andhra Pradesh, India', state: 'Andhra Pradesh', country: 'India', lat: 17.6868, lng: 83.2185, timezone: 'Asia/Kolkata' },
  { city: 'Patna', label: 'Patna, Bihar, India', state: 'Bihar', country: 'India', lat: 25.5941, lng: 85.1376, timezone: 'Asia/Kolkata' },
  { city: 'Vadodara', label: 'Vadodara, Gujarat, India', state: 'Gujarat', country: 'India', lat: 22.3072, lng: 73.1812, timezone: 'Asia/Kolkata' },
  { city: 'Ghaziabad', label: 'Ghaziabad, Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 28.6692, lng: 77.4538, timezone: 'Asia/Kolkata' },
  { city: 'Ludhiana', label: 'Ludhiana, Punjab, India', state: 'Punjab', country: 'India', lat: 30.9010, lng: 75.8573, timezone: 'Asia/Kolkata' },
  { city: 'Agra', label: 'Agra, Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 27.1767, lng: 78.0081, timezone: 'Asia/Kolkata' },
  { city: 'Nashik', label: 'Nashik, Maharashtra, India', state: 'Maharashtra', country: 'India', lat: 19.9975, lng: 73.7898, timezone: 'Asia/Kolkata' },
  { city: 'Faridabad', label: 'Faridabad, Haryana, India', state: 'Haryana', country: 'India', lat: 28.4089, lng: 77.3178, timezone: 'Asia/Kolkata' },
  { city: 'Meerut', label: 'Meerut, Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 28.9845, lng: 77.7064, timezone: 'Asia/Kolkata' },
  { city: 'Rajkot', label: 'Rajkot, Gujarat, India', state: 'Gujarat', country: 'India', lat: 22.3039, lng: 70.8022, timezone: 'Asia/Kolkata' },
  { city: 'Srinagar', label: 'Srinagar, Jammu and Kashmir, India', state: 'Jammu and Kashmir', country: 'India', lat: 34.0837, lng: 74.7973, timezone: 'Asia/Kolkata' },
  { city: 'Aurangabad', label: 'Chhatrapati Sambhajinagar, Maharashtra, India', state: 'Maharashtra', country: 'India', lat: 19.8762, lng: 75.3433, timezone: 'Asia/Kolkata' },
  { city: 'Dhanbad', label: 'Dhanbad, Jharkhand, India', state: 'Jharkhand', country: 'India', lat: 23.7957, lng: 86.4304, timezone: 'Asia/Kolkata' },
  { city: 'Navi Mumbai', label: 'Navi Mumbai, Maharashtra, India', state: 'Maharashtra', country: 'India', lat: 19.0330, lng: 73.0297, timezone: 'Asia/Kolkata' },
  { city: 'Ranchi', label: 'Ranchi, Jharkhand, India', state: 'Jharkhand', country: 'India', lat: 23.3441, lng: 85.3096, timezone: 'Asia/Kolkata' },
  { city: 'Howrah', label: 'Howrah, West Bengal, India', state: 'West Bengal', country: 'India', lat: 22.5958, lng: 88.2636, timezone: 'Asia/Kolkata' },
  { city: 'Coimbatore', label: 'Coimbatore, Tamil Nadu, India', state: 'Tamil Nadu', country: 'India', lat: 11.0168, lng: 76.9558, timezone: 'Asia/Kolkata' },
  { city: 'Jabalpur', label: 'Jabalpur, Madhya Pradesh, India', state: 'Madhya Pradesh', country: 'India', lat: 23.1815, lng: 79.9864, timezone: 'Asia/Kolkata' },
  { city: 'Gwalior', label: 'Gwalior, Madhya Pradesh, India', state: 'Madhya Pradesh', country: 'India', lat: 26.2183, lng: 78.1828, timezone: 'Asia/Kolkata' },
  { city: 'Vijayawada', label: 'Vijayawada, Andhra Pradesh, India', state: 'Andhra Pradesh', country: 'India', lat: 16.5062, lng: 80.6480, timezone: 'Asia/Kolkata' },
  { city: 'Jodhpur', label: 'Jodhpur, Rajasthan, India', state: 'Rajasthan', country: 'India', lat: 26.2389, lng: 73.0243, timezone: 'Asia/Kolkata' },
  { city: 'Raipur', label: 'Raipur, Chhattisgarh, India', state: 'Chhattisgarh', country: 'India', lat: 21.2514, lng: 81.6296, timezone: 'Asia/Kolkata' },
  { city: 'Kota', label: 'Kota, Rajasthan, India', state: 'Rajasthan', country: 'India', lat: 25.2138, lng: 75.8648, timezone: 'Asia/Kolkata' },
  { city: 'Guwahati', label: 'Guwahati, Assam, India', state: 'Assam', country: 'India', lat: 26.1445, lng: 91.7362, timezone: 'Asia/Kolkata' },
  { city: 'Chandigarh', label: 'Chandigarh, India', state: 'Chandigarh', country: 'India', lat: 30.7333, lng: 76.7794, timezone: 'Asia/Kolkata' },
  { city: 'Jalandhar', label: 'Jalandhar, Punjab, India', state: 'Punjab', country: 'India', lat: 31.3260, lng: 75.5762, timezone: 'Asia/Kolkata' },
  { city: 'Noida', label: 'Noida, Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 28.5355, lng: 77.3910, timezone: 'Asia/Kolkata' },
  { city: 'Gurugram', label: 'Gurugram, Haryana, India', state: 'Haryana', country: 'India', lat: 28.4595, lng: 77.0266, timezone: 'Asia/Kolkata', aliases: ['Gurgaon'] },
  { city: 'Dehradun', label: 'Dehradun, Uttarakhand, India', state: 'Uttarakhand', country: 'India', lat: 30.3165, lng: 78.0322, timezone: 'Asia/Kolkata' },
  { city: 'Jammu', label: 'Jammu, Jammu and Kashmir, India', state: 'Jammu and Kashmir', country: 'India', lat: 32.7266, lng: 74.8570, timezone: 'Asia/Kolkata' },
  { city: 'Shimla', label: 'Shimla, Himachal Pradesh, India', state: 'Himachal Pradesh', country: 'India', lat: 31.1048, lng: 77.1734, timezone: 'Asia/Kolkata' },
  { city: 'Dharamshala', label: 'Dharamshala, Himachal Pradesh, India', state: 'Himachal Pradesh', country: 'India', lat: 32.2190, lng: 76.3234, timezone: 'Asia/Kolkata' },
  { city: 'Udaipur', label: 'Udaipur, Rajasthan, India', state: 'Rajasthan', country: 'India', lat: 24.5854, lng: 73.7125, timezone: 'Asia/Kolkata' },
  { city: 'Mangalore', label: 'Mangalore, Karnataka, India', state: 'Karnataka', country: 'India', lat: 12.9141, lng: 74.8560, timezone: 'Asia/Kolkata' },
  { city: 'Mysuru', label: 'Mysuru, Karnataka, India', state: 'Karnataka', country: 'India', lat: 12.2958, lng: 76.6394, timezone: 'Asia/Kolkata' },
  { city: 'Kochi', label: 'Kochi, Kerala, India', state: 'Kerala', country: 'India', lat: 9.9312, lng: 76.2673, timezone: 'Asia/Kolkata' },
  { city: 'Thiruvananthapuram', label: 'Thiruvananthapuram, Kerala, India', state: 'Kerala', country: 'India', lat: 8.5241, lng: 76.9366, timezone: 'Asia/Kolkata', aliases: ['Trivandrum'] },
  { city: 'Bhubaneswar', label: 'Bhubaneswar, Odisha, India', state: 'Odisha', country: 'India', lat: 20.2961, lng: 85.8245, timezone: 'Asia/Kolkata' },
  { city: 'Siliguri', label: 'Siliguri, West Bengal, India', state: 'West Bengal', country: 'India', lat: 26.7271, lng: 88.3953, timezone: 'Asia/Kolkata' },
  { city: 'Gorakhpur', label: 'Gorakhpur, Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 26.7606, lng: 83.3732, timezone: 'Asia/Kolkata' },
  { city: 'Aligarh', label: 'Aligarh, Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 27.8974, lng: 78.0880, timezone: 'Asia/Kolkata' },
  { city: 'Bareilly', label: 'Bareilly, Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 28.3670, lng: 79.4304, timezone: 'Asia/Kolkata' },
  { city: 'Moradabad', label: 'Moradabad, Uttar Pradesh, India', state: 'Uttar Pradesh', country: 'India', lat: 28.8353, lng: 78.7747, timezone: 'Asia/Kolkata' },

  // Global Diaspora & International Centers
  { city: 'London', label: 'London, Greater London, United Kingdom', state: 'England', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, timezone: 'Europe/London' },
  { city: 'Leicester', label: 'Leicester, England, United Kingdom', state: 'England', country: 'United Kingdom', lat: 52.6369, lng: -1.1398, timezone: 'Europe/London' },
  { city: 'Birmingham', label: 'Birmingham, England, United Kingdom', state: 'England', country: 'United Kingdom', lat: 52.4862, lng: -1.8904, timezone: 'Europe/London' },
  { city: 'New York', label: 'New York, NY, United States', state: 'New York', country: 'United States', lat: 40.7128, lng: -74.0060, timezone: 'America/New_York' },
  { city: 'San Francisco', label: 'San Francisco, CA, United States', state: 'California', country: 'United States', lat: 37.7749, lng: -122.4194, timezone: 'America/Los_Angeles' },
  { city: 'San Jose', label: 'San Jose, CA, United States', state: 'California', country: 'United States', lat: 37.3382, lng: -121.8863, timezone: 'America/Los_Angeles' },
  { city: 'Fremont', label: 'Fremont, CA, United States', state: 'California', country: 'United States', lat: 37.5485, lng: -121.9886, timezone: 'America/Los_Angeles' },
  { city: 'Los Angeles', label: 'Los Angeles, CA, United States', state: 'California', country: 'United States', lat: 34.0522, lng: -118.2437, timezone: 'America/Los_Angeles' },
  { city: 'Chicago', label: 'Chicago, IL, United States', state: 'Illinois', country: 'United States', lat: 41.8781, lng: -87.6298, timezone: 'America/Chicago' },
  { city: 'Dallas', label: 'Dallas, TX, United States', state: 'Texas', country: 'United States', lat: 32.7767, lng: -96.7970, timezone: 'America/Chicago' },
  { city: 'Houston', label: 'Houston, TX, United States', state: 'Texas', country: 'United States', lat: 29.7604, lng: -95.3698, timezone: 'America/Chicago' },
  { city: 'Austin', label: 'Austin, TX, United States', state: 'Texas', country: 'United States', lat: 30.2672, lng: -97.7431, timezone: 'America/Chicago' },
  { city: 'Atlanta', label: 'Atlanta, GA, United States', state: 'Georgia', country: 'United States', lat: 33.7490, lng: -84.3880, timezone: 'America/New_York' },
  { city: 'Seattle', label: 'Seattle, WA, United States', state: 'Washington', country: 'United States', lat: 47.6062, lng: -122.3321, timezone: 'America/Los_Angeles' },
  { city: 'Toronto', label: 'Toronto, Ontario, Canada', state: 'Ontario', country: 'Canada', lat: 43.6532, lng: -79.3832, timezone: 'America/Toronto' },
  { city: 'Brampton', label: 'Brampton, Ontario, Canada', state: 'Ontario', country: 'Canada', lat: 43.7315, lng: -79.7624, timezone: 'America/Toronto' },
  { city: 'Mississauga', label: 'Mississauga, Ontario, Canada', state: 'Ontario', country: 'Canada', lat: 43.5890, lng: -79.6441, timezone: 'America/Toronto' },
  { city: 'Vancouver', label: 'Vancouver, BC, Canada', state: 'British Columbia', country: 'Canada', lat: 49.2827, lng: -123.1207, timezone: 'America/Vancouver' },
  { city: 'Surrey', label: 'Surrey, BC, Canada', state: 'British Columbia', country: 'Canada', lat: 49.1913, lng: -122.8490, timezone: 'America/Vancouver' },
  { city: 'Dubai', label: 'Dubai, United Arab Emirates', state: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708, timezone: 'Asia/Dubai' },
  { city: 'Abu Dhabi', label: 'Abu Dhabi, United Arab Emirates', state: 'Abu Dhabi', country: 'United Arab Emirates', lat: 24.4539, lng: 54.3773, timezone: 'Asia/Dubai' },
  { city: 'Singapore', label: 'Singapore', state: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, timezone: 'Asia/Singapore' },
  { city: 'Kuala Lumpur', label: 'Kuala Lumpur, Malaysia', state: 'Federal Territory', country: 'Malaysia', lat: 3.1390, lng: 101.6869, timezone: 'Asia/Kuala_Lumpur' },
  { city: 'Sydney', label: 'Sydney, NSW, Australia', state: 'New South Wales', country: 'Australia', lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney' },
  { city: 'Melbourne', label: 'Melbourne, VIC, Australia', state: 'Victoria', country: 'Australia', lat: -37.8136, lng: 144.9631, timezone: 'Australia/Melbourne' },
  { city: 'Auckland', label: 'Auckland, New Zealand', state: 'Auckland', country: 'New Zealand', lat: -36.8485, lng: 174.7633, timezone: 'Pacific/Auckland' },
  { city: 'Port Louis', label: 'Port Louis, Mauritius', state: 'Port Louis', country: 'Mauritius', lat: -20.1609, lng: 57.5012, timezone: 'Indian/Mauritius' },
  { city: 'Durban', label: 'Durban, KwaZulu-Natal, South Africa', state: 'KwaZulu-Natal', country: 'South Africa', lat: -29.8587, lng: 31.0218, timezone: 'Africa/Johannesburg' },
  { city: 'Kathmandu', label: 'Kathmandu, Nepal', state: 'Bagmati', country: 'Nepal', lat: 27.7172, lng: 85.3240, timezone: 'Asia/Kathmandu' },
  { city: 'Pokhara', label: 'Pokhara, Nepal', state: 'Gandaki', country: 'Nepal', lat: 28.2096, lng: 83.9856, timezone: 'Asia/Kathmandu' },
  { city: 'Colombo', label: 'Colombo, Sri Lanka', state: 'Western Province', country: 'Sri Lanka', lat: 6.9271, lng: 79.8612, timezone: 'Asia/Colombo' },
  { city: 'Suva', label: 'Suva, Fiji', state: 'Central', country: 'Fiji', lat: -18.1248, lng: 178.4501, timezone: 'Pacific/Fiji' },
  { city: 'Georgetown', label: 'Georgetown, Guyana', state: 'Demerara-Mahaica', country: 'Guyana', lat: 6.8013, lng: -58.1551, timezone: 'America/Guyana' },
  { city: 'Paramaribo', label: 'Paramaribo, Suriname', state: 'Paramaribo', country: 'Suriname', lat: 5.8520, lng: -55.2038, timezone: 'America/Paramaribo' },
];

export const CITY_CATALOG = POPULAR_CITIES;

/**
 * Filter local catalog with immediate prefix / substring / alias match
 */
export function searchLocalCities(query: string, limit = 5): CityRecord[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const startsWithMatches: CityRecord[] = [];
  const containsMatches: CityRecord[] = [];

  for (const item of POPULAR_CITIES) {
    const cityLower = item.city.toLowerCase();
    const labelLower = item.label.toLowerCase();
    const hasAliasPrefix = item.aliases?.some(a => a.toLowerCase().startsWith(q));
    const hasAliasContains = item.aliases?.some(a => a.toLowerCase().includes(q));

    if (cityLower.startsWith(q) || hasAliasPrefix) {
      startsWithMatches.push(item);
    } else if (cityLower.includes(q) || labelLower.includes(q) || hasAliasContains) {
      containsMatches.push(item);
    }

    if (startsWithMatches.length >= limit) break;
  }

  return [...startsWithMatches, ...containsMatches].slice(0, limit);
}
