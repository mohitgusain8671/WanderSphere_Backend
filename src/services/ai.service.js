import { GoogleGenerativeAI } from '@google/generative-ai';

class AIService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
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
}

export default new AIService();