import bcrypt from 'bcryptjs';
import { User, IUser, UserRole } from '../models/User';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';

export interface RegisterDTO {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: IUser;
}

export class AuthService {
  static async login({ email, password }: LoginDTO): Promise<AuthResult> {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      throw new AppError('Invalid email or password credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Account is disabled. Contact your compliance administrator.', 403, 'ACCOUNT_DISABLED');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    return { token, user };
  }

  static async register(dto: RegisterDTO): Promise<AuthResult> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      throw new AppError('An account with this email address already exists', 409, 'EMAIL_EXISTS');
    }

    const existingUsername = await User.findOne({ username: dto.username.trim() });
    if (existingUsername) {
      throw new AppError('An account with this username already exists', 409, 'USERNAME_EXISTS');
    }

    // Hash password with 12 salt rounds (industry standard for financial apps)
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = new User({
      username: dto.username.trim(),
      email: normalizedEmail,
      passwordHash,
      fullName: dto.fullName.trim(),
      role: dto.role || 'investigator',
    });

    await user.save();

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    return { token, user };
  }

  static async getProfile(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return user;
  }
}
