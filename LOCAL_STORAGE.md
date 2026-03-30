# Local Storage Implementation

This document describes the local storage implementation for media uploads, replacing the previous S3-based storage.

## Overview

The local storage system provides a secure and efficient way to handle file uploads with proper organization, validation, and security measures.

## Features

- **Secure File Handling**: Prevents path traversal attacks and sanitizes filenames
- **Organized Storage**: Files are organized in folders (brands, products, general)
- **UUID-based Naming**: Prevents filename collisions with unique identifiers
- **Static File Serving**: Files are served via Express static middleware
- **Error Handling**: Graceful error handling for file operations
- **Metadata Tracking**: File size, type, and path information stored in database

## Architecture

### LocalStorageService

Located in `src/infrastructure/storage/local-storage.service.ts`

**Key Methods:**
- `uploadFile()` - Uploads files with folder organization
- `deleteFile()` - Safely deletes files from storage
- `fileExists()` - Checks if a file exists
- `generateSafeFilename()` - Sanitizes filenames for security

### File Organization

```
uploads/
├── brands/
│   ├── {brandId}/
│   │   ├── avatar/
│   │   └── gallery/
├── products/
│   ├── {productId}/
│   │   ├── avatar/
│   │   └── gallery/
└── general/
    ├── 2024/
    │   ├── 1/
    │   ├── 2/
    │   └── ...
```

### URL Structure

Files are accessible via: `http://localhost:3001/uploads/{folder}/{filename}`

## Configuration

Add these environment variables to your `.env` file:

```env
# Local Storage Configuration
UPLOADS_DIR=./uploads
PUBLIC_BASE_URL=http://localhost:3001
```

## Security Measures

1. **Filename Sanitization**: Removes special characters and path traversal attempts
2. **UUID Prefix**: Prevents filename collisions
3. **File Type Validation**: MIME type checking in upload endpoints
4. **Path Validation**: Ensures files stay within designated directories

## Migration from S3

The migration involves:

1. **Service Replacement**: `S3Service` → `LocalStorageService`
2. **Module Updates**: `S3Module` → `LocalStorageModule`
3. **Static File Serving**: Added Express static middleware
4. **Database Updates**: Provider field changed from "s3" to "local"

## Performance Considerations

- **Disk Space**: Monitor disk usage as files are stored locally
- **Backup Strategy**: Implement regular backups of the uploads directory
- **CDN Integration**: Can be extended to use CDN for static files in production

## Development vs Production

### Development
- Files stored in local `uploads/` directory
- Served directly by Express
- Easy debugging and file access

### Production Recommendations
- Use dedicated storage volume
- Implement backup strategy
- Consider CDN integration
- Monitor disk usage and implement cleanup policies

## API Integration

The media upload endpoints remain the same, but now use local storage:

- `POST /admin/media/upload` - Admin upload with session auth
- `POST /api/admin/media/upload` - API upload with JWT auth

## Error Handling

- File upload failures return appropriate HTTP status codes
- Database operations are atomic with file operations
- Graceful degradation if file operations fail

## Future Enhancements

1. **Image Processing**: Add thumbnail generation and image optimization
2. **File Cleanup**: Implement automatic cleanup of unused files
3. **Storage Monitoring**: Add disk usage tracking and alerts
4. **CDN Integration**: Support for CDN integration in production
