import jwt from 'jsonwebtoken';

// Authentication Middleware
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'supersecretkeyforjwttokenauthandlogin');
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Access token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(403).json({ success: false, message: 'Invalid token.' });
    }
};

// Role Authorization Middleware
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied. Unauthorized role.' });
        }
        next();
    };
};
