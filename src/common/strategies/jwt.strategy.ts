import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Role } from '@prisma/client';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

// Shape of the decoded Supabase JWT payload
export interface SupabaseJwtPayload {
  sub: string;   // Supabase user UUID
  email: string;
  aud: string;   // "authenticated"
  role: string;  // Supabase role — NOT our app role
  iat: number;
  exp: number;
  user_metadata?: {
    name?: string;
    full_name?: string;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Modern Supabase projects sign access tokens asymmetrically (ES256)
      // rather than with the legacy shared HS256 secret. Verify against the
      // project's JWKS instead of SUPABASE_JWT_SECRET.
      algorithms: ['ES256', 'RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      }),
      // Supabase sets aud to "authenticated" — ignore it so we don't need
      // to configure the audience param on every call.
    });

    // Keep a reference so validate() can check the admin email.
    this.adminEmail = configService.getOrThrow<string>('ADMIN_EMAIL');
  }

  private readonly adminEmail: string;

  async validate(payload: SupabaseJwtPayload): Promise<Profile> {
    const isAdminEmail = payload.email === this.adminEmail;

    let profile = await this.prisma.profile.findUnique({
      where: { id: payload.sub },
    });

    if (!profile) {
      // First login — auto-create Profile row linked to Supabase user.
      profile = await this.prisma.profile.create({
        data: {
          id: payload.sub,
          name: payload.user_metadata?.name
            ?? payload.user_metadata?.full_name
            ?? payload.email.split('@')[0],
          role: isAdminEmail ? Role.admin : Role.customer,
          isVerified: true,
        },
      });
    } else if (isAdminEmail && profile.role !== Role.admin) {
      // Ensure the admin email always holds the admin role even if
      // the row was created before ADMIN_EMAIL was configured.
      profile = await this.prisma.profile.update({
        where: { id: payload.sub },
        data: { role: Role.admin },
      });
    }

    return profile;
  }
}
