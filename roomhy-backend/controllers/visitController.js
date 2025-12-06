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

// --- Public / Admin actions (for demo UI without JWT) ---
exports.approveVisitPublic = async (req, res) => {
    try {
        const id = req.params.id;
        const visit = await VisitReport.findById(id);
        if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

        // mark approved
        visit.status = 'approved';

        // generate credentials and create Owner record
        const Owner = require('../models/Owner');

        // create a unique loginId
        const count = await Owner.countDocuments();
        const nextNum = count + 1;
        const uniqueSuffix = Date.now().toString().slice(-4);
        const mockId = `ROOMHY${String(nextNum).padStart(3, '0')}-${uniqueSuffix}`;
        const tempPass = 'temp' + Math.floor(1000 + Math.random() * 9000);

        visit.generatedCredentials = { loginId: mockId, tempPassword: tempPass };

        await visit.save();

        // create owner
        const ownerData = {
            loginId: mockId,
            name: visit.propertyInfo.ownerName || visit.propertyInfo.name || 'Property Owner',
            phone: visit.propertyInfo.contactPhone || '',
            address: visit.propertyInfo.address || '',
            locationCode: visit.propertyInfo.locationCode || visit.propertyInfo.locationCode,
            credentials: { password: tempPass, firstTime: true },
            kyc: { status: 'pending' }
        };

        let owner = null;
        try {
            owner = await Owner.create(ownerData);
        } catch (e) {
            // If unique constraint fails or already exists, try to find existing
            owner = await Owner.findOne({ loginId: mockId });
        }

        return res.json({ success: true, visit, owner, credentials: visit.generatedCredentials });
    } catch (err) {
        console.error('Approve Visit Error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.rejectVisitPublic = async (req, res) => {
    try {
        const id = req.params.id;
        const visit = await VisitReport.findById(id);
        if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
        visit.status = 'rejected';
        await visit.save();
        return res.json({ success: true, visit });
    } catch (err) {
        console.error('Reject Visit Error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Public submit handler for demo UI (no authentication)
exports.submitVisitPublic = async (req, res) => {
    try {
        const { name, address, locationCode, contactPhone, notes, areaManager, areaManagerLogin } = req.body;

        // Try to resolve an area manager _id. If a valid ObjectId string is provided in `areaManager`, prefer it.
        let areaManagerId = areaManager || null;
        const UserModel = require('../models/user');

        if (!areaManagerId && areaManagerLogin) {
            // Try find by loginId or email/name
            const found = await UserModel.findOne({ $or: [{ loginId: areaManagerLogin }, { email: areaManagerLogin }, { name: areaManagerLogin }] }).lean();
            if (found) areaManagerId = found._id;
        }

        // If still not found, create a lightweight placeholder Area Manager user for demo purposes
        if (!areaManagerId) {
            const placeholder = await UserModel.create({
                name: areaManagerLogin || 'Demo Area Manager',
                loginId: (areaManagerLogin || 'DEMO_MANAGER') + '_' + Date.now().toString().slice(-4),
                role: 'areamanager',
                password: Math.random().toString(36).slice(-8)
            });
            areaManagerId = placeholder._id;
        }

        const report = await VisitReport.create({
            areaManager: areaManagerId,
            propertyInfo: { name, address, locationCode, contactPhone },
            notes,
            submittedToAdmin: true,
            status: 'submitted'
        });

        return res.status(201).json({ success: true, report });
    } catch (err) {
        console.error('Public Submit Visit Error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};