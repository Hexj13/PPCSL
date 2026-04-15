import * as fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import * as path from 'node:path';
import { Readable } from 'node:stream';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';

const S3_PREFIX = 'parsing-plp/';

@Injectable()
export class PlpStorageService {
  private readonly logger = new Logger(PlpStorageService.name);
  private readonly s3Client: S3Client | null;
  private readonly bucketName: string;
  readonly useS3: boolean;
  private readonly localRuntimeRoot: string;

  constructor() {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'eu-north-1';
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'kupito-uploads';

    this.useS3 = !!(accessKeyId && secretAccessKey && this.bucketName);

    if (this.useS3) {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId: accessKeyId!,
          secretAccessKey: secretAccessKey!,
        },
      });
      this.logger.log('[PlpStorage] S3 mode enabled');
    } else {
      this.s3Client = null;
      this.logger.log('[PlpStorage] Local filesystem mode (S3 credentials not configured)');
    }

    const fromEnv = process.env.PARSING_RUNTIME_DIR?.trim();
    if (fromEnv) {
      this.localRuntimeRoot = path.isAbsolute(fromEnv)
        ? fromEnv
        : path.join(process.cwd(), fromEnv);
    } else {
      this.localRuntimeRoot = path.join(process.cwd(), 'runtime', 'parsing');
    }
  }

  private s3Key(relativePath: string): string {
    return `${S3_PREFIX}${relativePath}`;
  }

  private localPath(relativePath: string): string {
    return path.join(this.localRuntimeRoot, relativePath);
  }

  async uploadFile(relativePath: string, content: string): Promise<void> {
    if (!this.useS3 || !this.s3Client) {
      const absPath = this.localPath(relativePath);
      await fsp.mkdir(path.dirname(absPath), { recursive: true });
      await fsp.writeFile(absPath, content, 'utf-8');
      return;
    }
    const key = this.s3Key(relativePath);
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: content,
        ContentType: 'application/json; charset=utf-8',
      }),
    );
    this.logger.debug(`[PlpStorage] uploaded ${key}`);
  }

  async downloadFile(relativePath: string): Promise<string | null> {
    if (!this.useS3 || !this.s3Client) {
      const absPath = this.localPath(relativePath);
      if (!fs.existsSync(absPath)) {
        return null;
      }
      return fsp.readFile(absPath, 'utf-8');
    }
    try {
      const result = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: this.s3Key(relativePath),
        }),
      );
      if (!result.Body) {
        return null;
      }
      const stream = result.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      return Buffer.concat(chunks).toString('utf-8');
    } catch (error: unknown) {
      const code = (error as { name?: string }).name;
      if (code === 'NoSuchKey' || code === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  async downloadToLocal(relativePath: string, localAbsPath: string): Promise<boolean> {
    const content = await this.downloadFile(relativePath);
    if (content === null) {
      return false;
    }
    await fsp.mkdir(path.dirname(localAbsPath), { recursive: true });
    await fsp.writeFile(localAbsPath, content, 'utf-8');
    return true;
  }

  async deleteFile(relativePath: string): Promise<void> {
    if (!this.useS3 || !this.s3Client) {
      const absPath = this.localPath(relativePath);
      if (fs.existsSync(absPath)) {
        await fsp.unlink(absPath);
      }
      return;
    }
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: this.s3Key(relativePath),
      }),
    );
    const absPath = this.localPath(relativePath);
    if (fs.existsSync(absPath)) {
      try {
        await fsp.unlink(absPath);
      } catch {
        /* local cleanup is best-effort */
      }
    }
    this.logger.debug(`[PlpStorage] deleted ${this.s3Key(relativePath)}`);
  }

  async listFiles(prefix: string): Promise<string[]> {
    if (!this.useS3 || !this.s3Client) {
      const dirPath = this.localPath(prefix);
      if (!fs.existsSync(dirPath)) {
        return [];
      }
      const names = await fsp.readdir(dirPath);
      return names
        .filter((name) => name.endsWith('.json'))
        .sort()
        .map((name) => `${prefix}${name}`);
    }
    const fullPrefix = this.s3Key(prefix);
    const result: string[] = [];
    let continuationToken: string | undefined;
    do {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: fullPrefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of response.Contents ?? []) {
        if (obj.Key && obj.Key.endsWith('.json')) {
          result.push(obj.Key.slice(S3_PREFIX.length));
        }
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
    return result.sort();
  }

  async getFileMetadata(
    relativePath: string,
  ): Promise<{ size: number; lastModified: Date } | null> {
    if (!this.useS3 || !this.s3Client) {
      const absPath = this.localPath(relativePath);
      try {
        const stat = await fsp.stat(absPath);
        return { size: stat.size, lastModified: stat.mtime };
      } catch {
        return null;
      }
    }
    try {
      const result = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: this.s3Key(relativePath),
        }),
      );
      return {
        size: result.ContentLength ?? 0,
        lastModified: result.LastModified ?? new Date(),
      };
    } catch (error: unknown) {
      const code = (error as { name?: string }).name;
      if (code === 'NotFound' || code === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }
}
