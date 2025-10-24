import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

@Injectable()
export class FilesService {
  private uploadDir: string;
  private maxFileSize: number;
  private allowedTypes: string[];

  constructor(private configService: ConfigService) {
    this.uploadDir =
      this.configService.get('UPLOAD_DIRECTORY') || './uploads';
    this.maxFileSize =
      this.configService.get<number>('MAX_FILE_SIZE') || 5242880; // 5MB
    this.allowedTypes =
      this.configService
        .get<string>('ALLOWED_FILE_TYPES')
        ?.split(',') || [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];

    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ url: string; filename: string }> {
    // Validate file
    this.validateFile(file);

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${userId}_${timestamp}${ext}`;
    const filepath = path.join(this.uploadDir, filename);

    // Save file
    await writeFile(filepath, file.buffer);

    // Return URL (in production, this would be a CDN URL)
    const url = `/uploads/${filename}`;

    return { url, filename };
  }

  async deleteFile(filename: string): Promise<void> {
    const filepath = path.join(this.uploadDir, filename);

    try {
      await unlink(filepath);
    } catch (error) {
      throw new NotFoundException('File not found');
    }
  }

  private validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize} bytes`,
      );
    }

    // Check file type
    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedTypes.join(', ')}`,
      );
    }
  }
}
