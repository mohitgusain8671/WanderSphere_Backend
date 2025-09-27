import { GoogleGenerativeAI } from '@google/generative-ai';

class AIService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }

    async generateWanderlustDestinations() {
        try {
            const prompt = `
Generate 3 unique and diverse travel destinations for wanderlust travelers. 
For each destination, provide the following information in valid JSON format:

{
    "destinations": [
        {
            "destination": "City, Country",
            "type": "Category (e.g., Tropical Paradise, Mountain Adventure, Cultural Heritage, etc.)",
            "emoji": "relevant emoji",
            "description": "Brief engaging description (50-80 words)",
            "highlights": ["highlight1", "highlight2", "highlight3"],
            "bestTime": "Best time to visit (e.g., April - October)",
            "activities": ["activity1", "activity2", "activity3", "activity4"],
            "article": "Detailed article about the destination (100-150 words)"
        }
    ]
}

Make sure each destination is from a different continent and offers different types of experiences.
Focus on lesser-known gems alongside popular destinations.
Ensure all JSON is properly formatted and valid.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Clean up the response to extract JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid AI response format');
            }
            
            const parsedData = JSON.parse(jsonMatch[0]);
            return parsedData.destinations;
        } catch (error) {
            console.error('Error generating wanderlust destinations:', error);
            // Fallback destinations if AI fails
            return this.getFallbackDestinations();
        }
    }

    async generateAdventureTip() {
        try {
            const prompt = `
Generate a single inspirational travel/adventure tip with wisdom.
Return it in the following JSON format:

{
    "tip": "🎯 Your inspirational travel tip with an emoji",
    "author": "Author name or 'Travel Wisdom' if original"
}

The tip should be motivational, practical, or philosophical about travel and adventure.
Use emojis to make it visually appealing.
Keep the tip concise but meaningful (10-20 words).
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Clean up the response to extract JSON
            const jsonMatch = text.match(/\{[\s\S]*?\}/);
            if (!jsonMatch) {
                throw new Error('Invalid AI response format');
            }
            
            const parsedData = JSON.parse(jsonMatch[0]);
            return parsedData;
        } catch (error) {
            console.error('Error generating adventure tip:', error);
            // Fallback tip if AI fails
            return this.getFallbackTip();
        }
    }

    getFallbackDestinations() {
        return [
            {
                destination: 'Faroe Islands, Denmark',
                type: 'Nordic Wonder',
                emoji: '🏔️',
                description: 'Remote Nordic islands with dramatic cliffs, grass-roof houses, and untouched wilderness',
                highlights: ['Mulafossur Waterfall', 'Saksun Village', 'Kallur Lighthouse'],
                bestTime: 'May - September',
                activities: ['Hiking', 'Photography', 'Bird watching', 'Nordic culture'],
                article: 'The Faroe Islands offer a unique blend of Nordic culture and pristine natural beauty. These 18 remote islands feature some of Europe\'s most dramatic landscapes, from towering cliffs to cascading waterfalls.'
            },
            {
                destination: 'Raja Ampat, Indonesia',
                type: 'Marine Paradise',
                emoji: '🐠',
                description: 'The crown jewel of marine biodiversity with pristine coral reefs and exotic wildlife',
                highlights: ['Pianemo Island', 'Arborek Village', 'Gam Island'],
                bestTime: 'October - April',
                activities: ['Diving', 'Snorkeling', 'Island hopping', 'Marine photography'],
                article: 'Raja Ampat, meaning "Four Kings," is home to 75% of all marine species. This remote archipelago offers unparalleled diving experiences with manta rays, sharks, and vibrant coral gardens.'
            },
            {
                destination: 'Salar de Uyuni, Bolivia',
                type: 'Natural Wonder',
                emoji: '✨',
                description: 'The world\'s largest salt flat creates a mirror effect that blurs the line between earth and sky',
                highlights: ['Mirror Effect', 'Flamingo Reserves', 'Incahuasi Island'],
                bestTime: 'March - May',
                activities: ['Photography', 'Stargazing', 'Salt harvesting tours', 'Flamingo watching'],
                article: 'Salar de Uyuni transforms dramatically with seasons. During rainy season, it becomes the world\'s largest mirror, while dry season reveals geometric salt patterns stretching to the horizon.'
            }
        ];
    }

    getFallbackTip() {
        const tips = [
            { tip: "🌍 The world is a book, and those who don't travel read only one page", author: "Saint Augustine" },
            { tip: "✈️ Adventure is worthwhile in itself", author: "Amelia Earhart" },
            { tip: "🎒 Travel far enough, you meet yourself", author: "David Mitchell" },
            { tip: "🌅 Collect moments, not things", author: "Travel Wisdom" },
            { tip: "🗺️ Not all who wander are lost", author: "J.R.R. Tolkien" }
        ];
        return tips[Math.floor(Math.random() * tips.length)];
    }

    /**
     * Generate a comprehensive travel itinerary based on user preferences
     */
    async generateItinerary(preferences) {
        try {
            const prompt = this.buildItineraryPrompt(preferences);
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const generatedText = response.text();
            
            // Parse the AI response into structured format
            return this.parseItineraryResponse(generatedText, preferences);
        } catch (error) {
            console.error('Error generating itinerary:', error);
            throw new Error('Failed to generate itinerary. Please try again.');
        }
    }

    /**
     * Build a comprehensive prompt for itinerary generation
     */
    buildItineraryPrompt(preferences) {
        const {
            destination,
            startDate,
            endDate,
            duration,
            budget,
            travelStyle,
            interests,
            accommodation,
            transportation,
            groupSize,
            specialRequirements
        } = preferences;

        return `You are an expert travel planner. Create a comprehensive ${duration}-day travel itinerary for ${destination}.

TRIP DETAILS:
- Destination: ${destination}
- Start Date: ${startDate}
- End Date: ${endDate}
- Duration: ${duration} days
- Budget: ${budget}
- Travel Style: ${travelStyle}
- Interests: ${interests.join(', ')}
- Accommodation: ${accommodation}
- Transportation: ${transportation}
- Group Size: ${groupSize} people
- Special Requirements: ${specialRequirements || 'None'}

Please provide the response in the following JSON format:

{
  "title": "Attractive trip title",
  "overview": "Compelling 2-3 sentence overview of the trip",
  "highlights": [
    "Top highlight 1",
    "Top highlight 2",
    "Top highlight 3",
    "Top highlight 4",
    "Top highlight 5"
  ],
  "dailyPlan": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "Day theme (e.g., 'Arrival & Old Town Exploration')",
      "activities": [
        {
          "time": "09:00 AM",
          "activity": "Activity name",
          "location": "Specific location",
          "description": "Detailed description with what to expect",
          "estimatedCost": "$XX per person",
          "tips": "Helpful tip for this activity"
        }
      ]
    }
  ],
  "recommendations": {
    "restaurants": [
      {
        "name": "Restaurant Name",
        "cuisine": "Cuisine type",
        "priceRange": "Budget/Mid-range/Upscale",
        "location": "Area/Address",
        "speciality": "Must-try dish"
      }
    ],
    "hotels": [
      {
        "name": "Hotel Name",
        "type": "Hotel/Hostel/B&B etc.",
        "priceRange": "$XX-XX per night",
        "location": "Area name",
        "amenities": ["Amenity 1", "Amenity 2"]
      }
    ],
    "tips": [
      {
        "category": "Transportation",
        "tip": "Specific tip"
      },
      {
        "category": "Culture",
        "tip": "Cultural insight"
      },
      {
        "category": "Money",
        "tip": "Money-saving tip"
      },
      {
        "category": "Safety",
        "tip": "Safety advice"
      },
      {
        "category": "Local Experience",
        "tip": "Local experience tip"
      }
    ]
  },
  "estimatedBudget": {
    "total": "$XXXX per person",
    "breakdown": {
      "accommodation": "$XXX",
      "food": "$XXX",
      "activities": "$XXX",
      "transportation": "$XXX",
      "miscellaneous": "$XXX"
    }
  }
}

IMPORTANT GUIDELINES:
1. Create ${duration} detailed daily plans with 4-6 activities each day
2. Include specific times, locations, and realistic costs
3. Balance must-see attractions with local experiences
4. Consider travel time between activities
5. Match the ${budget} budget level (budget: under $100/day, mid-range: $100-300/day, luxury: $300+/day)
6. Incorporate the ${travelStyle} style throughout
7. Include interests: ${interests.join(', ')}
8. Provide practical tips and insider knowledge
9. Suggest 5-7 restaurants and 3-5 accommodation options
10. Give realistic cost estimates based on current prices
11. Consider group size of ${groupSize} people in recommendations
12. Make the itinerary engaging and well-structured

Please respond with valid JSON only, no additional text.`;
    }

    /**
     * Parse the AI response into structured format
     */
    parseItineraryResponse(responseText, preferences) {
        try {
            // Clean the response text - remove any markdown formatting or extra text
            let cleanedText = responseText.trim();
            
            // Remove markdown code blocks if present
            cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            
            // Find JSON content between curly braces
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleanedText = jsonMatch[0];
            }
            
            // Parse JSON
            const parsedData = JSON.parse(cleanedText);
            
            // Validate and structure the response with enhanced parsing
            return {
                title: parsedData.title || `${preferences.duration}-Day ${preferences.destination} Adventure`,
                destination: preferences.destination,
                overview: parsedData.overview || `An amazing ${preferences.duration}-day journey through ${preferences.destination}.`,
                highlights: this.ensureArray(parsedData.highlights),
                dailyPlan: this.validateDailyPlan(parsedData.dailyPlan || [], preferences),
                recommendations: {
                    restaurants: this.parseRecommendations(parsedData.recommendations?.restaurants, 'restaurants'),
                    hotels: this.parseRecommendations(parsedData.recommendations?.hotels, 'hotels'),
                    tips: this.parseRecommendations(parsedData.recommendations?.tips, 'tips')
                },
                estimatedBudget: {
                    total: parsedData.estimatedBudget?.total || 'Contact for pricing',
                    breakdown: {
                        accommodation: parsedData.estimatedBudget?.breakdown?.accommodation || 'TBD',
                        food: parsedData.estimatedBudget?.breakdown?.food || 'TBD',
                        activities: parsedData.estimatedBudget?.breakdown?.activities || 'TBD',
                        transportation: parsedData.estimatedBudget?.breakdown?.transportation || 'TBD',
                        miscellaneous: parsedData.estimatedBudget?.breakdown?.miscellaneous || 'TBD'
                    }
                }
            };
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            console.error('Raw response:', responseText);
            
            // Return a fallback structured response
            return this.generateFallbackItinerary(preferences, responseText);
        }
    }

    /**
     * Ensure data is an array and handle string JSON arrays
     */
    ensureArray(data) {
        if (!data) return [];
        
        // If it's already an array, return it
        if (Array.isArray(data)) return data;
        
        // If it's a string that looks like JSON array, try to parse it
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data);
                return Array.isArray(parsed) ? parsed : [data];
            } catch {
                // If parsing fails, return as single item array
                return [data];
            }
        }
        
        // If it's an object or other type, wrap in array
        return [data];
    }

    /**
     * Parse recommendations with proper error handling
     */
    parseRecommendations(data, type) {
        if (!data) return [];
        
        // If it's already an array, return it
        if (Array.isArray(data)) return data;
        
        // If it's a string that looks like JSON, try to parse it
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            } catch (parseError) {
                console.error(`Error parsing ${type} recommendations:`, parseError);
                return [];
            }
        }
        
        // If it's an object, wrap it in array
        if (typeof data === 'object') {
            return [data];
        }
        
        return [];
    }

    /**
     * Validate and ensure daily plan structure
     */
    validateDailyPlan(dailyPlan, preferences) {
        const validatedPlan = [];
        const startDate = new Date(preferences.startDate);
        
        for (let i = 0; i < preferences.duration; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const dayData = dailyPlan[i] || {};
            
            validatedPlan.push({
                day: i + 1,
                date: currentDate.toISOString().split('T')[0],
                theme: dayData.theme || `Day ${i + 1} - ${preferences.destination} Exploration`,
                activities: Array.isArray(dayData.activities) ? dayData.activities.map(activity => ({
                    time: activity.time || '10:00 AM',
                    activity: activity.activity || 'Explore local attractions',
                    location: activity.location || preferences.destination,
                    description: activity.description || 'Discover the beauty and culture of the area',
                    estimatedCost: activity.estimatedCost || 'Free',
                    tips: activity.tips || 'Enjoy the experience!'
                })) : []
            });
        }
        
        return validatedPlan;
    }
}

export default new AIService();
