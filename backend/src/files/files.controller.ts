import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file (image)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.filesService.uploadFile(file, req.user.id);
  }

  @Delete(':filename')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async deleteFile(@Param('filename') filename: string) {
    await this.filesService.deleteFile(filename);
    return { message: 'File deleted successfully' };
  }
}
