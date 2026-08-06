import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import User from '../models/User.js';

// 1. Get all roles with populated permissions (auto-initializes system roles if empty)
export const getAllRoles = async (req, res) => {
    try {
        // Drop legacy strict user_1 index if it exists in MongoDB
        await Permission.collection.dropIndex('user_1').catch(() => {});

        const defaultRoles = [
            {
                name: 'admin',
                description: 'Full administrative access across system',
                isSystem: true,
                perms: { canCreateTicket: true, canReadTicket: true, canUpdateTicket: true, canDeleteTicket: true }
            },
            {
                name: 'manager',
                description: 'Management access to tickets and workflows',
                isSystem: true,
                perms: { canCreateTicket: true, canReadTicket: true, canUpdateTicket: true, canDeleteTicket: true }
            },
            {
                name: 'user',
                description: 'Standard viewer user account',
                isSystem: true,
                perms: { canCreateTicket: false, canReadTicket: true, canUpdateTicket: false, canDeleteTicket: false }
            }
        ];

        // Ensure all 3 default system roles exist in DB
        for (const def of defaultRoles) {
            let role = await Role.findOne({ name: new RegExp(`^${def.name}$`, 'i') });
            if (!role) {
                const perm = new Permission({
                    canCreateTicket: def.perms.canCreateTicket,
                    canReadTicket: def.perms.canReadTicket,
                    canUpdateTicket: def.perms.canUpdateTicket,
                    canDeleteTicket: def.perms.canDeleteTicket
                });
                await perm.save();

                role = new Role({
                    name: def.name.toLowerCase(),
                    description: def.description,
                    permissions: perm._id,
                    isSystem: def.isSystem
                });
                await role.save();

                perm.role = role._id;
                await perm.save();
            } else if (!role.permissions) {
                let perm = await Permission.findOne({ role: role._id });
                if (!perm) {
                    perm = new Permission({
                        role: role._id,
                        canCreateTicket: def.perms.canCreateTicket,
                        canReadTicket: def.perms.canReadTicket,
                        canUpdateTicket: def.perms.canUpdateTicket,
                        canDeleteTicket: def.perms.canDeleteTicket
                    });
                    await perm.save();
                }
                role.permissions = perm._id;
                await role.save();
            }
        }

        const roles = await Role.find({}).populate('permissions');
        res.json({ success: true, roles });
    } catch (error) {
        console.error('Fetch roles error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Update permissions for a specific role
export const updateRolePermissions = async (req, res) => {
    try {
        const { roleName } = req.params;
        const { canCreateTicket, canReadTicket, canUpdateTicket, canDeleteTicket } = req.body;

        const role = await Role.findOne({ name: new RegExp(`^${roleName}$`, 'i') }).populate('permissions');
        if (!role) {
            return res.status(404).json({ success: false, message: 'Role not found' });
        }

        let permission = role.permissions;
        if (!permission) {
            permission = new Permission({ role: role._id });
            await permission.save();
            role.permissions = permission._id;
            await role.save();
        }

        if (typeof canCreateTicket === 'boolean') permission.canCreateTicket = canCreateTicket;
        if (typeof canReadTicket === 'boolean') permission.canReadTicket = canReadTicket;
        if (typeof canUpdateTicket === 'boolean') permission.canUpdateTicket = canUpdateTicket;
        if (typeof canDeleteTicket === 'boolean') permission.canDeleteTicket = canDeleteTicket;
        permission.updatedAt = new Date();

        await permission.save();

        const updatedRole = await Role.findById(role._id).populate('permissions');

        res.json({
            success: true,
            message: `Permissions updated for role '${role.name}'`,
            role: updatedRole
        });
    } catch (error) {
        console.error('Update role permissions error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Create a custom role dynamically
export const createRole = async (req, res) => {
    try {
        const { name, description, canCreateTicket, canReadTicket, canUpdateTicket, canDeleteTicket } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Role name is required' });
        }

        const roleNameLower = name.trim().toLowerCase();
        const existingRole = await Role.findOne({ name: new RegExp(`^${roleNameLower}$`, 'i') });
        if (existingRole) {
            return res.status(400).json({ success: false, message: 'Role with this name already exists' });
        }

        const perm = new Permission({
            canCreateTicket: !!canCreateTicket,
            canReadTicket: canReadTicket !== false,
            canUpdateTicket: !!canUpdateTicket,
            canDeleteTicket: !!canDeleteTicket
        });
        await perm.save();

        const role = new Role({
            name: roleNameLower,
            description: description || '',
            permissions: perm._id,
            isSystem: false
        });
        await role.save();

        perm.role = role._id;
        await perm.save();

        const createdRole = await Role.findById(role._id).populate('permissions');

        res.status(201).json({
            success: true,
            message: 'Role created successfully',
            role: createdRole
        });
    } catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
