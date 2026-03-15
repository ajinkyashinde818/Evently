const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    // Extract token from Bearer format
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    console.log('Verifying token:', token);

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified successfully:', verified);

    req.user = verified;

    next();

  } catch (error) {
    console.error('Token verification error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired. Please login again." });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid token format. Please login again." });
    }
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authMiddleware;