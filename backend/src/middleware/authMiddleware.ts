import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import { User, UserRole } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication required: No Bearer token provided', 401, 'UNAUTHORIZED');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);

    // Verify user is still active in database
    const user = await User.findById(decoded.userId).select('isActive role');
    if (!user || !user.isActive) {
      sendError(res, 'User session is inactive or account has been disabled', 401, 'USER_INACTIVE');
      return;
    }

    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      sendError(res, 'Authentication token has expired', 401, 'TOKEN_EXPIRED');
      return;
    }
    sendError(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Access forbidden: Requires one of [${allowedRoles.join(', ')}] roles`,
        403,
        'FORBIDDEN'
      );
      return;
    }

    next();
  };
}
