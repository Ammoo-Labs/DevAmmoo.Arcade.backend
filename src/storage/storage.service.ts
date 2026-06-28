import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import ws from 'ws';

@Injectable()
export class StorageService {
  private readonly supabase: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    this.supabase = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      // Service role key bypasses RLS — never expose to the client
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { realtime: { transport: ws as any } },
    );
  }

  async upload(
    bucket: string,
    folder: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const path = `${folder}/${randomUUID()}.${ext}`;

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) {
      throw new InternalServerErrorException(`Storage upload failed: ${error.message}`);
    }

    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async uploadMany(
    bucket: string,
    folder: string,
    files: Express.Multer.File[],
  ): Promise<string[]> {
    return Promise.all(files.map((f) => this.upload(bucket, folder, f)));
  }

  async deleteByUrl(bucket: string, publicUrl: string): Promise<void> {
    try {
      const marker = `/storage/v1/object/public/${bucket}/`;
      const path = publicUrl.split(marker)[1];
      if (path) await this.supabase.storage.from(bucket).remove([path]);
    } catch {
      // Best-effort deletion — do not fail the calling operation
    }
  }
}
