import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || 'fallback_echolet_secret_key';
};

export const getResolvedServerUrl = (req: Request): string => {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host =
    (req.headers['x-forwarded-host'] as string) ||
    req.get('host') ||
    `localhost:${process.env.PORT || 3000}`;
  return `${proto}://${host}`;
};

export const getResolvedClientOrigin = (req?: Request): string => {
  const requestOrigin =
    req?.get('origin') || (req?.headers.referer ? new URL(req.headers.referer).origin : '');

  if (process.env.CLIENT_ORIGIN?.trim()) {
    const origins = process.env.CLIENT_ORIGIN.split(',')
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter(Boolean);

    if (requestOrigin && origins.includes(requestOrigin)) {
      return requestOrigin;
    }
    return origins[0] || 'http://localhost:5173';
  }

  return requestOrigin || 'http://localhost:5173';
};

const sendTokenCookie = (
  user: User,
  rememberMe: boolean,
  res: Response,
  message: string,
  statusCode = 200,
  req?: Request
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
  const isSecure =
    isProduction || Boolean(req?.secure) || req?.headers['x-forwarded-proto'] === 'https';

  res.cookie('echolet_token', token, {
    httpOnly: true,
    secure: Boolean(isSecure),
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: cookieMaxAge,
    path: '/',
  });

  const { password: _, googleId: __, ...sanitizedUser } = user as any;

  res.status(statusCode).json({
    status: 'success',
    message,
    user: sanitizedUser,
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

    sendTokenCookie(newUser, false, res, 'Account created successfully!', 201, req);
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

    if (!user.password) {
      res.status(401).json({
        status: 'error',
        message: 'This account was created with Google Sign-In. Please sign in using Google.',
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
      `Welcome back, ${user.fullName || user.username}!`,
      200,
      req
    );
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'An unexpected error occurred during login.',
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure =
      isProduction || Boolean(req.secure) || req.headers['x-forwarded-proto'] === 'https';

    res.clearCookie('echolet_token', {
      httpOnly: true,
      secure: Boolean(isSecure),
      sameSite: isSecure ? 'none' : 'lax',
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

    const { password: _, googleId: __, ...sanitizedUser } = req.user as any;

    res.status(200).json({
      status: 'success',
      user: sanitizedUser,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch user profile.',
    });
  }
};

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean | string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

const verifyGoogleCredential = async (credential: string): Promise<GoogleUserInfo | null> => {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as any;
    if (!data.email || (data.email_verified !== true && data.email_verified !== 'true')) {
      return null;
    }

    // If GOOGLE_CLIENT_ID is configured, verify audience matches
    const configuredClientId = process.env.GOOGLE_CLIENT_ID;
    if (configuredClientId && data.aud && data.aud !== configuredClientId) {
      console.warn('Google token audience mismatch:', { aud: data.aud, expected: configuredClientId });
      return null;
    }

    return {
      sub: data.sub,
      email: data.email,
      email_verified: data.email_verified,
      name: data.name,
      picture: data.picture,
      given_name: data.given_name,
      family_name: data.family_name,
    };
  } catch (err) {
    console.error('Error verifying Google credential:', err);
    return null;
  }
};

const fetchGoogleProfileByAccessToken = async (accessToken: string): Promise<GoogleUserInfo | null> => {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as any;
    return {
      sub: data.sub,
      email: data.email,
      email_verified: data.email_verified,
      name: data.name,
      picture: data.picture,
      given_name: data.given_name,
      family_name: data.family_name,
    };
  } catch (err) {
    console.error('Error fetching Google userinfo with access token:', err);
    return null;
  }
};

const generateUniqueUsername = async (
  userRepository: any,
  baseName: string,
  email: string
): Promise<string> => {
  let cleaned = (baseName || email.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);

  if (!cleaned || cleaned.length < 3) {
    cleaned = 'user_' + Math.floor(1000 + Math.random() * 9000);
  }

  let candidate = cleaned;
  let counter = 1;

  while (await userRepository.findOne({ where: { username: candidate } })) {
    candidate = `${cleaned}${counter}`;
    counter++;
  }

  return candidate;
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential, accessToken } = req.body;

    if (!credential && !accessToken) {
      res.status(400).json({
        status: 'error',
        message: 'Google credential (id_token) or accessToken is required.',
      });
      return;
    }

    let googleProfile: GoogleUserInfo | null = null;
    if (credential) {
      googleProfile = await verifyGoogleCredential(credential);
    } else if (accessToken) {
      googleProfile = await fetchGoogleProfileByAccessToken(accessToken);
    }

    if (!googleProfile || !googleProfile.email) {
      res.status(401).json({
        status: 'error',
        message: 'Google authentication failed. Token is invalid or expired.',
      });
      return;
    }

    const cleanEmail = googleProfile.email.toLowerCase().trim();
    const userRepository = AppDataSource.getRepository(User);

    let user = await userRepository.findOne({
      where: [{ email: cleanEmail }, { googleId: googleProfile.sub }],
    });

    if (user) {
      let needsSave = false;
      if (!user.googleId) {
        user.googleId = googleProfile.sub;
        needsSave = true;
      }
      if (!user.avatarUrl && googleProfile.picture) {
        user.avatarUrl = googleProfile.picture;
        needsSave = true;
      }
      if (needsSave) {
        await userRepository.save(user);
      }

      sendTokenCookie(
        user,
        true,
        res,
        `Welcome back, ${user.fullName || user.username}!`,
        200,
        req
      );
      return;
    }

    // Register new Google user
    const generatedUsername = await generateUniqueUsername(
      userRepository,
      googleProfile.name || '',
      cleanEmail
    );

    const newUser = userRepository.create({
      fullName: googleProfile.name || generatedUsername,
      username: generatedUsername,
      email: cleanEmail,
      avatarUrl: googleProfile.picture || undefined,
      googleId: googleProfile.sub,
      birthday: 'Not specified',
      gender: 'Not specified',
    });

    await userRepository.save(newUser);

    sendTokenCookie(
      newUser,
      true,
      res,
      `Welcome to Echolet, ${newUser.fullName}!`,
      201,
      req
    );
  } catch (error: any) {
    console.error('Google OAuth API error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'An error occurred during Google authentication.',
    });
  }
};

export const googleOAuthRedirect = (req: Request, res: Response): void => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientOrigin = getResolvedClientOrigin(req);

  if (!clientId) {
    res.redirect(`${clientOrigin}/login?error=google_service_error`);
    return;
  }

  const serverUrl = getResolvedServerUrl(req);
  const redirectUri = `${serverUrl}/api/auth/google/callback`;

  // Encode client origin in OAuth state to return user to their originating frontend domain
  const state = Buffer.from(JSON.stringify({ origin: clientOrigin, t: Date.now() })).toString(
    'base64url'
  );

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account&state=${encodeURIComponent(
    state
  )}`;

  res.redirect(url);
};

export const googleOAuthCallback = async (req: Request, res: Response): Promise<void> => {
  let clientOrigin = getResolvedClientOrigin(req);

  // Restore client origin from state
  if (req.query.state) {
    try {
      const parsed = JSON.parse(
        Buffer.from(String(req.query.state), 'base64url').toString('utf8')
      );
      if (parsed.origin) clientOrigin = parsed.origin;
    } catch {
      // fallback to resolved client origin
    }
  }

  try {
    const { code } = req.query;

    if (!code) {
      res.redirect(`${clientOrigin}/login?error=google_service_error`);
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const serverUrl = getResolvedServerUrl(req);
    const redirectUri = `${serverUrl}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      res.redirect(`${clientOrigin}/login?error=google_service_error`);
      return;
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      res.redirect(`${clientOrigin}/login?error=google_token_exchange_failed`);
      return;
    }

    const tokenData = (await tokenResponse.json()) as any;
    let googleProfile: GoogleUserInfo | null = null;
    if (tokenData.id_token) {
      googleProfile = await verifyGoogleCredential(tokenData.id_token);
    } else if (tokenData.access_token) {
      googleProfile = await fetchGoogleProfileByAccessToken(tokenData.access_token);
    }

    if (!googleProfile || !googleProfile.email) {
      res.redirect(`${clientOrigin}/login?error=google_profile_fetch_failed`);
      return;
    }

    const cleanEmail = googleProfile.email.toLowerCase().trim();
    const userRepository = AppDataSource.getRepository(User);

    let user = await userRepository.findOne({
      where: [{ email: cleanEmail }, { googleId: googleProfile.sub }],
    });

    if (!user) {
      const generatedUsername = await generateUniqueUsername(
        userRepository,
        googleProfile.name || '',
        cleanEmail
      );

      user = userRepository.create({
        fullName: googleProfile.name || generatedUsername,
        username: generatedUsername,
        email: cleanEmail,
        avatarUrl: googleProfile.picture || undefined,
        googleId: googleProfile.sub,
        birthday: 'Not specified',
        gender: 'Not specified',
      });

      await userRepository.save(user);
    } else {
      let needsSave = false;
      if (!user.googleId) {
        user.googleId = googleProfile.sub;
        needsSave = true;
      }
      if (!user.avatarUrl && googleProfile.picture) {
        user.avatarUrl = googleProfile.picture;
        needsSave = true;
      }
      if (needsSave) {
        await userRepository.save(user);
      }
    }

    const secret = getJwtSecret();
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
      },
      secret,
      { expiresIn: '30d' }
    );

    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure =
      isProduction || Boolean(req.secure) || req.headers['x-forwarded-proto'] === 'https';

    res.cookie('echolet_token', token, {
      httpOnly: true,
      secure: Boolean(isSecure),
      sameSite: isSecure ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.redirect(`${clientOrigin}/?auth=google_success`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.redirect(`${clientOrigin}/login?error=google_server_error`);
  }
};

