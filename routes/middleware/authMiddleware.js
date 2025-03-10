import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    const decoded = jwt.verify(token, 'your_secret_key');
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

export default authMiddleware;
