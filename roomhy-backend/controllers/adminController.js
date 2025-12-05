const VisitReport = require('../models/VisitReport');
const Property = require('../models/Property');
const User = require('../models/user');
const Owner = require('../models/Owner'); // Import Owner Model
const Notification = require('../models/Notification');
const generateOwnerId = require('../utils/generateOwnerId');

exports.approveVisit = async (req, res) => {
    try {
        const visitId = req.params.id;
        const visit = await VisitReport.findById(visitId);
        
        if (!visit) return res.status(404).json({ success: false, message: 'Visit report not found' });
        if (visit.status === 'approved') return res.status(400).json({ success: false, message: 'Already approved' });

        const info = visit.propertyInfo || {};
        const title = info.name || 'Untitled Property';
        const locationCode = info.locationCode || 'GEN';

        // 1. Generate IDs
        const loginId = await generateOwnerId(locationCode);
        const tempPassword = Math.random().toString(36).slice(-8) || 'roomhy123';

        // 2. Create Login User (For Auth)
        const user = await User.create({
            name: info.ownerName || 'Owner',
            phone: info.contactPhone || '0000000000',
            password: tempPassword, // Will be hashed by User model
            role: 'owner',
            loginId: loginId,
            locationCode: locationCode,
            status: 'active'
        });

        // 3. Create Owner Profile (For Dashboard Profile Data)
        // Note: We confirm password here just for record or handle via User only.
        // Usually, we keep profile details here.
        await Owner.create({
            loginId: loginId,
            name: info.ownerName,
            phone: info.contactPhone,
            address: info.address,
            locationCode: locationCode,
            credentials: { password: tempPassword, firstTime: true }, // Store temp pass reference if needed
            kyc: { status: 'pending' }
        });

        // 4. Create Property (Inactive)
        const property = await Property.create({
            title,
            description: visit.notes || 'Created via Visit Report',
            address: info.address,
            locationCode,
            status: 'inactive', 
            isPublished: false,
            owner: user._id, // Link to User ID
            ownerLoginId: loginId
        });

        // 5. Update Visit Report
        visit.status = 'approved';
        visit.generatedCredentials = { loginId, tempPassword };
        visit.property = property._id;
        await visit.save();

        // 6. Notifications (Optional - keep existing logic)
        // ... (keep your existing notification code here) ...

        return res.status(201).json({ 
            success: true, 
            message: 'Approved & Created in MongoDB',
            ownerCredentials: { loginId, tempPassword } 
        });

    } catch (err) {
        console.error("Approval Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};