import * as fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import * as path from 'node:path';

import { PlpStorageService } from './plp-storage.service';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
  ListObjectsV2Command: jest.fn(),
}));

describe('PlpStorageService (local mode)', () => {
  let service: PlpStorageService;
  const testDir = path.join(__dirname, '__test-plp-storage__');

  beforeAll(() => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    process.env.PARSING_RUNTIME_DIR = testDir;
  });

  beforeEach(() => {
    service = new PlpStorageService();
  });

  afterEach(async () => {
    if (fs.existsSync(testDir)) {
      await fsp.rm(testDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    delete process.env.PARSING_RUNTIME_DIR;
  });

  it('should use local mode when S3 credentials are not set', () => {
    expect(service.useS3).toBe(false);
  });

  it('should upload and download file locally', async () => {
    const relativePath = 'test-parser/test-file.json';
    const content = JSON.stringify({ items: {}, meta: {} });

    await service.uploadFile(relativePath, content);
    const downloaded = await service.downloadFile(relativePath);

    expect(downloaded).toBe(content);
  });

  it('should return null for missing file', async () => {
    const result = await service.downloadFile('nonexistent/file.json');
    expect(result).toBeNull();
  });

  it('should delete file locally', async () => {
    const relativePath = 'test-parser/delete-me.json';
    await service.uploadFile(relativePath, '{}');

    await service.deleteFile(relativePath);

    const result = await service.downloadFile(relativePath);
    expect(result).toBeNull();
  });

  it('should not throw when deleting nonexistent file', async () => {
    await expect(service.deleteFile('nonexistent/file.json')).resolves.toBeUndefined();
  });

  it('should list files in a directory', async () => {
    await service.uploadFile('myparser/a.json', '{}');
    await service.uploadFile('myparser/b.json', '{}');
    await service.uploadFile('myparser/c.txt', 'not json');

    const files = await service.listFiles('myparser/');

    expect(files).toEqual(['myparser/a.json', 'myparser/b.json']);
  });

  it('should return empty list for nonexistent directory', async () => {
    const files = await service.listFiles('nonexistent/');
    expect(files).toEqual([]);
  });

  it('should download to a specific local path', async () => {
    const relativePath = 'parser/source.json';
    const content = '{"test": true}';
    await service.uploadFile(relativePath, content);

    const targetPath = path.join(testDir, 'download-target', 'output.json');
    const ok = await service.downloadToLocal(relativePath, targetPath);

    expect(ok).toBe(true);
    const read = await fsp.readFile(targetPath, 'utf-8');
    expect(read).toBe(content);
  });

  it('should return false when downloading nonexistent file', async () => {
    const targetPath = path.join(testDir, 'nowhere', 'output.json');
    const ok = await service.downloadToLocal('missing/file.json', targetPath);
    expect(ok).toBe(false);
  });

  it('should get file metadata', async () => {
    const relativePath = 'meta-test/file.json';
    const content = '{"data": "value"}';
    await service.uploadFile(relativePath, content);

    const meta = await service.getFileMetadata(relativePath);

    expect(meta).not.toBeNull();
    expect(meta!.size).toBeGreaterThan(0);
    expect(new Date(meta!.lastModified).getTime()).not.toBeNaN();
  });

  it('should return null metadata for missing file', async () => {
    const meta = await service.getFileMetadata('missing/file.json');
    expect(meta).toBeNull();
  });
});
