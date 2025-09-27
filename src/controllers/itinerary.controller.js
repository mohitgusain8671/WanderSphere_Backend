import Itinerary from '#models/Itinerary.model.js';
import AIService from '#services/ai.service.js';

class ItineraryController {
    /**
     * Generate a new AI-powered travel itinerary
     */
    async generateItinerary(req, res) {
        try {
            console.log('Generating itinerary...');
            const userId = req.user.id;
            const {
                destination,
                startDate,
                endDate,
                budget,
                travelStyle,
                interests,
                accommodation,
                transportation,
                groupSize,
                specialRequirements
            } = req.body;

            // Validate required fields
            if (!destination || !startDate || !endDate || !budget || !travelStyle || !interests || interests.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields. Please provide destination, dates, budget, travel style, and interests.'
                });
            }

            // Calculate duration
            const start = new Date(startDate);
            const end = new Date(endDate);
            const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

            if (duration < 1 || duration > 30) {
                return res.status(400).json({
                    success: false,
                    message: 'Trip duration must be between 1 and 30 days.'
                });
            }

            // Prepare preferences for AI service
            const preferences = {
                destination,
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
                duration,
                budget,
                travelStyle,
                interests: Array.isArray(interests) ? interests : [interests],
                accommodation: accommodation || 'hotel',
                transportation: transportation || 'mixed',
                groupSize: groupSize || 1,
                specialRequirements: specialRequirements || ''
            };
            console.log('Sending Preference to Gemini');
            // Generate itinerary using AI service
            const aiGeneratedContent = await AIService.generateItinerary(preferences);
            console.log('Received Preference from Gemini');
            
            // Debug: Log the AI generated content structure
            console.log('AI Generated Content structure:');
            console.log('- Title:', aiGeneratedContent.title);
            console.log('- Highlights type:', typeof aiGeneratedContent.highlights, Array.isArray(aiGeneratedContent.highlights));
            console.log('- Recommendations type:', typeof aiGeneratedContent.recommendations);
            if (aiGeneratedContent.recommendations) {
                console.log('- Hotels type:', typeof aiGeneratedContent.recommendations.hotels, Array.isArray(aiGeneratedContent.recommendations.hotels));
                console.log('- Restaurants type:', typeof aiGeneratedContent.recommendations.restaurants, Array.isArray(aiGeneratedContent.recommendations.restaurants));
                console.log('- Tips type:', typeof aiGeneratedContent.recommendations.tips, Array.isArray(aiGeneratedContent.recommendations.tips));
            }
            
            // Create and save itinerary to database
            const itinerary = new Itinerary({
                userId,
                title: aiGeneratedContent.title,
                destination: aiGeneratedContent.destination,
                preferences: {
                    startDate: start,
                    endDate: end,
                    duration,
                    budget,
                    travelStyle,
                    interests: preferences.interests,
                    accommodation: preferences.accommodation,
                    transportation: preferences.transportation,
                    groupSize: preferences.groupSize,
                    specialRequirements: preferences.specialRequirements
                },
                overview: aiGeneratedContent.overview,
                highlights: aiGeneratedContent.highlights,
                dailyPlan: aiGeneratedContent.dailyPlan,
                recommendations: aiGeneratedContent.recommendations,
                estimatedBudget: aiGeneratedContent.estimatedBudget,
                tags: [destination.toLowerCase(), travelStyle.toLowerCase(), budget.toLowerCase()]
            });

            await itinerary.save();

            res.status(201).json({
                success: true,
                message: 'Itinerary generated successfully',
                data: {
                    itinerary: {
                        id: itinerary._id,
                        title: itinerary.title,
                        destination: itinerary.destination,
                        duration: itinerary.preferences.duration,
                        startDate: itinerary.preferences.startDate,
                        endDate: itinerary.preferences.endDate,
                        overview: itinerary.overview,
                        highlights: itinerary.highlights,
                        dailyPlan: itinerary.dailyPlan,
                        recommendations: itinerary.recommendations,
                        estimatedBudget: itinerary.estimatedBudget,
                        preferences: itinerary.preferences,
                        createdAt: itinerary.createdAt
                    }
                }
            });
        } catch (error) {
            console.error('Error generating itinerary:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate itinerary. Please try again.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get all itineraries for the authenticated user
     */
    async getUserItineraries(req, res) {
        try {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search;

            let query = { userId };

            // Add search functionality
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { destination: { $regex: search, $options: 'i' } },
                    { tags: { $in: [new RegExp(search, 'i')] } }
                ];
            }

            const result = await Itinerary.getUserItineraries(userId, page, limit);

            // Apply search filter if provided
            let itineraries = result.itineraries;
            if (search) {
                itineraries = await Itinerary.find(query)
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .select('-dailyPlan -recommendations')
                    .lean();
            }

            // Format response
            const formattedItineraries = itineraries.map(itinerary => ({
                id: itinerary._id,
                title: itinerary.title,
                destination: itinerary.destination,
                duration: itinerary.preferences.duration,
                startDate: itinerary.preferences.startDate,
                endDate: itinerary.preferences.endDate,
                budget: itinerary.preferences.budget,
                travelStyle: itinerary.preferences.travelStyle,
                overview: itinerary.overview,
                highlights: itinerary.highlights.slice(0, 3), // First 3 highlights
                estimatedBudget: itinerary.estimatedBudget.total,
                rating: itinerary.rating,
                createdAt: itinerary.createdAt,
                updatedAt: itinerary.updatedAt
            }));

            res.status(200).json({
                success: true,
                message: 'Itineraries retrieved successfully',
                data: {
                    itineraries: formattedItineraries,
                    pagination: search ? {
                        current: page,
                        pages: Math.ceil(itineraries.length / limit),
                        total: itineraries.length
                    } : result.pagination
                }
            });
        } catch (error) {
            console.error('Error fetching user itineraries:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch itineraries.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get a specific itinerary by ID
     */
    async getItineraryById(req, res) {
        try {
            const userId = req.user.id;
            const itineraryId = req.params.id;

            const itinerary = await Itinerary.getByIdAndUser(itineraryId, userId);

            if (!itinerary) {
                return res.status(404).json({
                    success: false,
                    message: 'Itinerary not found or you do not have permission to view it.'
                });
            }

            // Format complete itinerary response
            const formattedItinerary = {
                id: itinerary._id,
                title: itinerary.title,
                destination: itinerary.destination,
                overview: itinerary.overview,
                highlights: itinerary.highlights,
                dailyPlan: itinerary.dailyPlan,
                recommendations: itinerary.recommendations,
                estimatedBudget: itinerary.estimatedBudget,
                preferences: itinerary.preferences,
                rating: itinerary.rating,
                notes: itinerary.notes,
                tags: itinerary.tags,
                isPublic: itinerary.isPublic,
                createdAt: itinerary.createdAt,
                updatedAt: itinerary.updatedAt
            };

            res.status(200).json({
                success: true,
                message: 'Itinerary retrieved successfully',
                data: {
                    itinerary: formattedItinerary
                }
            });
        } catch (error) {
            console.error('Error fetching itinerary:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch itinerary.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Update itinerary rating
     */
    async updateItineraryRating(req, res) {
        try {
            const userId = req.user.id;
            const itineraryId = req.params.id;
            const { rating } = req.body;

            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Rating must be between 1 and 5.'
                });
            }

            const itinerary = await Itinerary.findOne({ _id: itineraryId, userId });

            if (!itinerary) {
                return res.status(404).json({
                    success: false,
                    message: 'Itinerary not found or you do not have permission to update it.'
                });
            }

            await itinerary.updateRating(rating);

            res.status(200).json({
                success: true,
                message: 'Itinerary rating updated successfully',
                data: {
                    rating: itinerary.rating
                }
            });
        } catch (error) {
            console.error('Error updating itinerary rating:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update itinerary rating.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Add or update notes for an itinerary
     */
    async updateItineraryNotes(req, res) {
        try {
            const userId = req.user.id;
            const itineraryId = req.params.id;
            const { notes } = req.body;

            const itinerary = await Itinerary.findOne({ _id: itineraryId, userId });

            if (!itinerary) {
                return res.status(404).json({
                    success: false,
                    message: 'Itinerary not found or you do not have permission to update it.'
                });
            }

            await itinerary.addNotes(notes || '');

            res.status(200).json({
                success: true,
                message: 'Itinerary notes updated successfully',
                data: {
                    notes: itinerary.notes
                }
            });
        } catch (error) {
            console.error('Error updating itinerary notes:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update itinerary notes.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Delete an itinerary
     */
    async deleteItinerary(req, res) {
        try {
            const userId = req.user.id;
            const itineraryId = req.params.id;

            const itinerary = await Itinerary.findOne({ _id: itineraryId, userId });

            if (!itinerary) {
                return res.status(404).json({
                    success: false,
                    message: 'Itinerary not found or you do not have permission to delete it.'
                });
            }

            await Itinerary.findByIdAndDelete(itineraryId);

            res.status(200).json({
                success: true,
                message: 'Itinerary deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting itinerary:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete itinerary.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get popular destinations (for inspiration)
     */
    async getPopularDestinations(req, res) {
        try {
            const popularDestinations = await Itinerary.aggregate([
                {
                    $group: {
                        _id: '$destination',
                        count: { $sum: 1 },
                        avgRating: { $avg: '$rating' },
                        travelStyles: { $addToSet: '$preferences.travelStyle' }
                    }
                },
                {
                    $match: {
                        count: { $gte: 2 } // At least 2 itineraries for the destination
                    }
                },
                {
                    $sort: { count: -1, avgRating: -1 }
                },
                {
                    $limit: 10
                }
            ]);

            const formattedDestinations = popularDestinations.map(dest => ({
                destination: dest._id,
                itineraryCount: dest.count,
                averageRating: dest.avgRating ? Math.round(dest.avgRating * 10) / 10 : null,
                popularTravelStyles: dest.travelStyles.slice(0, 3)
            }));

            res.status(200).json({
                success: true,
                message: 'Popular destinations retrieved successfully',
                data: {
                    destinations: formattedDestinations
                }
            });
        } catch (error) {
            console.error('Error fetching popular destinations:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch popular destinations.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export default new ItineraryController();