const jwt = require('jsonwebtoken');

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: Missing Authentication Token' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'SUPER_SECRET_KEY', (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or Expired Token' });
    req.user = user; // Contains user_id, organization_id, and role
    next();
  });
};

exports.authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient Permissions' });
    }
    next();
  };
};
