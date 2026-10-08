import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || 'fallback_echolet_secret_key';
};

const sendTokenCookie = (
  user: User,
  rememberMe: boolean,
  res: Response,
  message: string,
  statusCode = 200
) => {
  const secret = getJwtSecret();
  const expiresIn = rememberMe ? '30d' : '1d';
  const cookieMaxAge = rememberMe
    ? 30 * 24 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;

  const signOptions: SignOptions = {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  };

  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      email: user.email,
    },
    secret,
    signOptions
  );

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('echolet_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: cookieMaxAge,
    path: '/',
  });

  const { password: _, ...userWithoutPassword } = user as any;

  res.status(statusCode).json({
    status: 'success',
    message,
    user: userWithoutPassword,
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, username, email, birthday, gender, password } = req.body;

    if (!fullName || !username || !email || !birthday || !gender || !password) {
      res.status(400).json({
        status: 'error',
        message: 'All fields are required (fullName, username, email, birthday, gender, password).',
      });
      return;
    }

    const cleanUsername = String(username).toLowerCase().trim();
    const cleanEmail = String(email).toLowerCase().trim();

    if (password.length < 6) {
      res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long.',
      });
      return;
    }

    const userRepository = AppDataSource.getRepository(User);

    const existingUser = await userRepository.findOne({
      where: [{ username: cleanUsername }, { email: cleanEmail }],
    });

    if (existingUser) {
      if (existingUser.username === cleanUsername) {
        res.status(409).json({
          status: 'error',
          message: 'Username is already taken. Please choose another one.',
        });
        return;
      }
      if (existingUser.email === cleanEmail) {
        res.status(409).json({
          status: 'error',
          message: 'An account with this email address already exists.',
        });
        return;
      }
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = userRepository.create({
      fullName: String(fullName).trim(),
      username: cleanUsername,
      email: cleanEmail,
      birthday: String(birthday).trim(),
      gender: String(gender).trim(),
      password: hashedPassword,
    });

    await userRepository.save(newUser);

    sendTokenCookie(newUser, false, res, 'Account created successfully!', 201);
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'An unexpected error occurred during registration.',
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      res.status(400).json({
        status: 'error',
        message: 'Please provide username/email and password.',
      });
      return;
    }

    const identifier = String(username).toLowerCase().trim();
    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :identifier OR user.email = :identifier', { identifier })
      .getOne();

    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid username/email or password.',
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid username/email or password.',
      });
      return;
    }

    const isRemembered = Boolean(rememberMe);

    sendTokenCookie(
      user,
      isRemembered,
      res,
      `Welcome back, ${user.fullName || user.username}!`
    );
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'An unexpected error occurred during login.',
    });
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('echolet_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to log out.',
    });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated.',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      user: req.user,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch user profile.',
    });
  }
};
