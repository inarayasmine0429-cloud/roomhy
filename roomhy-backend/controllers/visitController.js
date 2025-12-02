const VisitReport = require('../models/VisitReport');
const Notification = require('../models/Notification');
const User = require('../models/user');

// 1. Submit a visit report (Area Manager)
exports.submitVisit = async (req, res) => {
    try {
        const { name, address, locationCode, contactPhone, notes, submittedToAdmin } = req.body;
        
        // Use authenticated user ID if available, otherwise check body (for testing)
        const areaManagerId = req.user ? req.user._id : (req.body.areaManager || null);

        if (!areaManagerId) {
             return res.status(401).json({ success: false, message: 'Unauthorized: Area Manager ID required' });
        }

        const report = await VisitReport.create({
            areaManager: areaManagerId,
            propertyInfo: { name, address, locationCode, contactPhone },
            notes,
            submittedToAdmin: true, 
            status: 'submitted'
        });

        // Notify Super Admins
        const superAdmins = await User.find({ role: 'superadmin' }).lean();
        if (superAdmins.length > 0) {
            const notifications = superAdmins.map(sa => ({
                recipient: sa._id,
                type: 'visit_submitted',
                message: `New Property Visit: ${name} (${locationCode})`,
                meta: { reportId: report._id, locationCode }
            }));
            await Notification.insertMany(notifications);
        }

        return res.status(201).json({ success: true, report });
    } catch (err) {
        console.error("Submit Visit Error:", err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// 2. Get Visits for the logged-in Area Manager
exports.getMyVisits = async (req, res) => {
    try {
        const userId = req.user._id;
        const visits = await VisitReport.find({ areaManager: userId }).sort({ submittedAt: -1 }).lean();
        res.json({ success: true, visits });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// 3. Get Pending Visits (FOR SUPER ADMIN ENQUIRY PAGE)
exports.getPendingVisits = async (req, res) => {
    try {
        // Fetch only reports that are submitted but not yet approved
        const visits = await VisitReport.find({ status: 'submitted' })
            .populate('areaManager', 'name email') // Get Area Manager details
            .sort({ submittedAt: 1 }) // Oldest first
            .lean();
        res.json({ success: true, visits });
    } catch (err) {
        console.error("Pending Visits Error:", err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};