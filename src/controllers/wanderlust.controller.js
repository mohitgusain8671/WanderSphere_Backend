import AIService from '#services/ai.service.js';
import Wanderlust from '#models/wanderlust.model.js';
import AdventureTip from '#models/adventureTip.model.js';

class WanderlustController {
    // Get today's wanderlust destinations
    async getTodaysWanderlust(req, res) {
        try {
            const today = Wanderlust.getTodayDate();
            
            // Check if we already have wanderlust for today
            let wanderlust = await Wanderlust.findOne({ date: today });
            
            if (wanderlust) {
                return res.status(200).json({
                    success: true,
                    message: 'Today\'s wanderlust destinations retrieved successfully',
                    data: {
                        destinations: wanderlust.destinations,
                        date: wanderlust.date,
                        cached: true
                    }
                });
            }
            
            // Generate new destinations using AI
            const aiDestinations = await AIService.generateWanderlustDestinations();
            
            // Save to database
            wanderlust = await Wanderlust.findOrCreateToday(aiDestinations);
            
            res.status(200).json({
                success: true,
                message: 'Today\'s wanderlust destinations generated successfully',
                data: {
                    destinations: wanderlust.destinations,
                    date: wanderlust.date,
                    cached: false
                }
            });
            
        } catch (error) {
            console.error('Get wanderlust error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get wanderlust destinations'
            });
        }
    }
    
    // Get today's adventure tip
    async getTodaysAdventureTip(req, res) {
        try {
            const today = AdventureTip.getTodayDate();
            
            // Check if we already have a tip for today
            let adventureTip = await AdventureTip.findOne({ date: today });
            
            if (adventureTip) {
                return res.status(200).json({
                    success: true,
                    message: 'Today\'s adventure tip retrieved successfully',
                    data: {
                        tip: adventureTip.tip,
                        author: adventureTip.author,
                        date: adventureTip.date,
                        cached: true
                    }
                });
            }
            
            // Generate new tip using AI
            const aiTip = await AIService.generateAdventureTip();
            
            // Save to database
            adventureTip = await AdventureTip.findOrCreateToday(aiTip);
            
            res.status(200).json({
                success: true,
                message: 'Today\'s adventure tip generated successfully',
                data: {
                    tip: adventureTip.tip,
                    author: adventureTip.author,
                    date: adventureTip.date,
                    cached: false
                }
            });
            
        } catch (error) {
            console.error('Get adventure tip error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get adventure tip'
            });
        }
    }
    
    // Get all wanderlust destinations (for admin or history)
    async getAllWanderlust(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;
            
            const wanderlusts = await Wanderlust.find()
                .sort({ date: -1 })
                .limit(parseInt(limit))
                .skip(skip);
                
            const total = await Wanderlust.countDocuments();
            
            res.status(200).json({
                success: true,
                message: 'Wanderlust destinations retrieved successfully',
                data: {
                    wanderlusts,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalItems: total,
                        itemsPerPage: parseInt(limit)
                    }
                }
            });
            
        } catch (error) {
            console.error('Get all wanderlust error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get wanderlust destinations'
            });
        }
    }
    
    // Get all adventure tips (for admin or history)
    async getAllAdventureTips(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;
            
            const tips = await AdventureTip.find()
                .sort({ date: -1 })
                .limit(parseInt(limit))
                .skip(skip);
                
            const total = await AdventureTip.countDocuments();
            
            res.status(200).json({
                success: true,
                message: 'Adventure tips retrieved successfully',
                data: {
                    tips,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalItems: total,
                        itemsPerPage: parseInt(limit)
                    }
                }
            });
            
        } catch (error) {
            console.error('Get all adventure tips error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get adventure tips'
            });
        }
    }
    
    // Force regenerate today's content (admin only)
    async regenerateTodaysContent(req, res) {
        try {
            const { type } = req.body; // 'wanderlust' or 'tip' or 'both'
            const today = Wanderlust.getTodayDate();
            
            let results = {};
            
            if (type === 'wanderlust' || type === 'both') {
                // Delete existing wanderlust for today
                await Wanderlust.deleteOne({ date: today });
                
                // Generate new destinations
                const aiDestinations = await AIService.generateWanderlustDestinations();
                const wanderlust = await Wanderlust.findOrCreateToday(aiDestinations);
                
                results.wanderlust = {
                    destinations: wanderlust.destinations,
                    date: wanderlust.date
                };
            }
            
            if (type === 'tip' || type === 'both') {
                // Delete existing tip for today
                await AdventureTip.deleteOne({ date: today });
                
                // Generate new tip
                const aiTip = await AIService.generateAdventureTip();
                const adventureTip = await AdventureTip.findOrCreateToday(aiTip);
                
                results.tip = {
                    tip: adventureTip.tip,
                    author: adventureTip.author,
                    date: adventureTip.date
                };
            }
            
            res.status(200).json({
                success: true,
                message: 'Content regenerated successfully',
                data: results
            });
            
        } catch (error) {
            console.error('Regenerate content error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to regenerate content'
            });
        }
    }
}

export default new WanderlustController();