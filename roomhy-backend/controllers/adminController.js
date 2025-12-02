const VisitReport = require('../models/VisitReport');
const Property = require('../models/Property');
const User = require('../models/user');
const Notification = require('../models/Notification');
const generateOwnerId = require('../utils/generateOwnerId');

// Approve a visit report: create Property and Owner (owner loginId generated)
exports.approveVisit = async (req, res) => {
    try {
        const visitId = req.params.id;
        const visit = await VisitReport.findById(visitId);
        
        if (!visit) return res.status(404).json({ success: false, message: 'Visit report not found' });
        if (visit.status === 'approved') return res.status(400).json({ success: false, message: 'Already approved' });

        const info = visit.propertyInfo || {};
        const title = info.name || 'Untitled Property';
        const address = info.address || '';
        const locationCode = info.locationCode;

        if (!locationCode) return res.status(400).json({ success: false, message: 'Missing locationCode in visit report' });

        // 1. Generate Owner ID (e.g., KO01)
        const loginId = await generateOwnerId(locationCode);
        const tempPassword = Math.random().toString(36).slice(-8) || 'roomhy123';

        // 2. Create Owner User
        const ownerUser = await User.create({
            name: `${title} Owner`,
            phone: info.contactPhone || '0000000000',
            password: tempPassword,
            role: 'owner',
            loginId: loginId,
            locationCode: locationCode,
            status: 'active'
        });

        // 3. Create Property (Strictly INACTIVE initially)
        // This listing remains hidden (inactive/unpublished) until Super Admin explicitly publishes it
        const property = await Property.create({
            title,
            description: visit.notes || 'Created via Visit Report',
            address,
            locationCode,
            status: 'inactive', 
            isPublished: false,
            owner: ownerUser._id,
            ownerLoginId: loginId
        });

        // 4. Update Visit Report Status and attach generated credentials & property reference
        visit.status = 'approved';
        visit.generatedCredentials = { loginId, tempPassword };
        visit.property = property._id;
        await visit.save();

        // 5. Notifications
        // Notify Area Manager (The one who submitted it)
        if (visit.areaManager) {
            await Notification.create({
                recipient: visit.areaManager,
                type: 'property_approved',
                message: `Approved: ${title}. Owner ID: ${loginId} created.`,
                meta: { propertyId: property._id }
            });
        }
        
        // Notify Super Admins (Confirmation)
        const superAdmins = await User.find({ role: 'superadmin' }).lean();
        const adminNotes = superAdmins.map(sa => ({
            recipient: sa._id,
            type: 'property_created',
            message: `Property '${title}' approved and created (Inactive).`,
            meta: { propertyId: property._id }
        }));
        await Notification.insertMany(adminNotes);

        return res.status(201).json({ 
            success: true, 
            message: 'Property approved and Owner created',
            property, 
            ownerCredentials: { loginId, tempPassword } 
        });

    } catch (err) {
        console.error("Approval Error:", err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};