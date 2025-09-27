import express from 'express';
import ItineraryController from '#controllers/itinerary.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';

const router = express.Router();

// All itinerary routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/itinerary/generate
 * @desc    Generate a new AI-powered travel itinerary
 * @access  Private
 * @body    {
 *   destination: String (required),
 *   startDate: String (required, ISO format),
 *   endDate: String (required, ISO format),
 *   budget: String (required, 'budget'|'mid-range'|'luxury'),
 *   travelStyle: String (required, 'adventure'|'relaxation'|'cultural'|'family'|'romantic'|'business'|'backpacking'),
 *   interests: Array<String> (required),
 *   accommodation: String (optional, 'hotel'|'hostel'|'airbnb'|'resort'|'guesthouse'),
 *   transportation: String (optional, 'flight'|'train'|'bus'|'car'|'mixed'),
 *   groupSize: Number (optional, default: 1),
 *   specialRequirements: String (optional)
 * }
 */
router.post('/generate', ItineraryController.generateItinerary);

/**
 * @route   GET /api/itinerary
 * @desc    Get all itineraries for the authenticated user
 * @access  Private
 * @query   {
 *   page: Number (optional, default: 1),
 *   limit: Number (optional, default: 10),
 *   search: String (optional, search in title, destination, tags)
 * }
 */
router.get('/', ItineraryController.getUserItineraries);

/**
 * @route   GET /api/itinerary/popular-destinations
 * @desc    Get popular destinations based on generated itineraries
 * @access  Private
 */
router.get('/popular-destinations', ItineraryController.getPopularDestinations);

/**
 * @route   GET /api/itinerary/:id
 * @desc    Get a specific itinerary by ID
 * @access  Private
 * @params  id: String (Itinerary ID)
 */
router.get('/:id', ItineraryController.getItineraryById);

/**
 * @route   PUT /api/itinerary/:id/rating
 * @desc    Update itinerary rating
 * @access  Private
 * @params  id: String (Itinerary ID)
 * @body    {
 *   rating: Number (required, 1-5)
 * }
 */
router.put('/:id/rating', ItineraryController.updateItineraryRating);

/**
 * @route   PUT /api/itinerary/:id/notes
 * @desc    Add or update notes for an itinerary
 * @access  Private
 * @params  id: String (Itinerary ID)
 * @body    {
 *   notes: String (optional)
 * }
 */
router.put('/:id/notes', ItineraryController.updateItineraryNotes);

/**
 * @route   DELETE /api/itinerary/:id
 * @desc    Delete an itinerary
 * @access  Private
 * @params  id: String (Itinerary ID)
 */
router.delete('/:id', ItineraryController.deleteItinerary);

export default router;