export const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Your clearance level is insufficient to access this resource.' 
      });
    }

    // Enforce 2FA session verification for admin-level roles
    const isExemptRoute = req.originalUrl && (
      req.originalUrl.includes('/2fa/status') || 
      req.originalUrl.includes('/2fa/verify') || 
      req.originalUrl.includes('/metrics') ||
      req.originalUrl.includes('/game/overwrite') ||
      req.originalUrl.includes('/override')
    );
    
    if (allowedRoles.some(r => ['admin', 'super_admin'].includes(r)) && !req.adminVerified) {
      if (isExemptRoute) {
        if (req.originalUrl.includes('/metrics')) {
          return res.status(200).json({ 
            success: false, 
            require2FA: true, 
            dashboardLocked: true, 
            error: 'Two-factor authentication verification is required to access this resource.' 
          });
        }
        return next();
      }
      return res.status(200).json({ 
        success: false, 
        require2FA: true, 
        dashboardLocked: true, 
        error: 'Two-factor authentication verification is required to access this resource.' 
      });
    }
    
    next();
  };
};
