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

import { resolveParsingRuntimeRoot } from '../../common/parsing-runtime-path';

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
      this.logger.log('[PlpStorage] Disk primary; S3 mirror and fallback enabled');
    } else {
      this.s3Client = null;
      this.logger.log('[PlpStorage] Disk only (S3 credentials not configured)');
    }

    this.localRuntimeRoot = resolveParsingRuntimeRoot();
  }

  private s3Key(relativePath: string): string {
    return `${S3_PREFIX}${relativePath}`;
  }

  private localPath(relativePath: string): string {
    return path.join(this.localRuntimeRoot, relativePath);
  }

  async uploadFile(relativePath: string, content: string): Promise<void> {
    const absPath = this.localPath(relativePath);
    await fsp.mkdir(path.dirname(absPath), { recursive: true });
    await fsp.writeFile(absPath, content, 'utf-8');

    if (!this.useS3 || !this.s3Client) {
      return;
    }
    const key = this.s3Key(relativePath);
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: content,
          ContentType: 'application/json; charset=utf-8',
        }),
      );
      this.logger.debug(`[PlpStorage] mirrored to S3 ${key}`);
    } catch (error: unknown) {
      this.logger.warn(
        `[PlpStorage] S3 mirror failed key=${key} error=${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async downloadFile(relativePath: string): Promise<string | null> {
    const absPath = this.localPath(relativePath);
    if (fs.existsSync(absPath)) {
      return fsp.readFile(absPath, 'utf-8');
    }
    if (!this.useS3 || !this.s3Client) {
      return null;
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
    const absPath = this.localPath(relativePath);
    if (fs.existsSync(absPath)) {
      await fsp.unlink(absPath);
    }
    if (!this.useS3 || !this.s3Client) {
      return;
    }
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: this.s3Key(relativePath),
        }),
      );
      this.logger.debug(`[PlpStorage] deleted from S3 ${this.s3Key(relativePath)}`);
    } catch (error: unknown) {
      const code = (error as { name?: string }).name;
      if (code !== 'NotFound' && code !== 'NoSuchKey') {
        throw error;
      }
    }
  }

  async listFiles(prefix: string): Promise<string[]> {
    const merged = new Set<string>();
    const dirPath = this.localPath(prefix);
    if (fs.existsSync(dirPath)) {
      const names = await fsp.readdir(dirPath);
      for (const name of names) {
        if (name.endsWith('.json')) {
          merged.add(`${prefix}${name}`);
        }
      }
    }
    if (this.useS3 && this.s3Client) {
      const fullPrefix = this.s3Key(prefix);
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
            merged.add(obj.Key.slice(S3_PREFIX.length));
          }
        }
        continuationToken = response.NextContinuationToken;
      } while (continuationToken);
    }
    return [...merged].sort();
  }

  async getFileMetadata(
    relativePath: string,
  ): Promise<{ size: number; lastModified: Date } | null> {
    const absPath = this.localPath(relativePath);
    try {
      const stat = await fsp.stat(absPath);
      return { size: stat.size, lastModified: stat.mtime };
    } catch {
      /* try S3 */
    }
    if (!this.useS3 || !this.s3Client) {
      return null;
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
