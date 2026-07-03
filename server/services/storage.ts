import fs from "fs";
import path from "path";

// Ensure folders exist on boot
const STORAGE_DIR = path.join(process.cwd(), "storage");
const VIDEOS_DIR = path.join(STORAGE_DIR, "videos");
const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });

export interface UploadedFileMetadata {
  provider: string;
  path: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  thumbnail_path?: string;
  created_at: string;
}

export interface IStorageProvider {
  saveFile(file: Express.Multer.File, isPublic: boolean): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
}

class LocalStorageProvider implements IStorageProvider {
  async saveFile(file: Express.Multer.File, isPublic: boolean): Promise<string> {
    const fileExt = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
    const targetDir = isPublic ? PUBLIC_UPLOADS_DIR : VIDEOS_DIR;
    const targetPath = path.join(targetDir, uniqueName);

    if (file.path) {
      try {
        await fs.promises.rename(file.path, targetPath);
      } catch (err) {
        await fs.promises.copyFile(file.path, targetPath);
        await fs.promises.unlink(file.path).catch(() => {});
      }
    } else if (file.buffer) {
      await fs.promises.writeFile(targetPath, file.buffer);
    } else {
      throw new Error("No file content or path found for saving.");
    }

    return isPublic ? `/uploads/${uniqueName}` : uniqueName;
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      if (filePath.startsWith("/uploads/")) {
        const fullPath = path.join(PUBLIC_UPLOADS_DIR, path.basename(filePath));
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
        }
      } else {
        const fullPath = path.join(VIDEOS_DIR, filePath);
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
        }
      }
    } catch (err) {
      console.error("StorageProvider delete error:", err);
    }
  }
}

// Singleton storage provider instance (can be easily switched to S3, Cloudinary etc. later)
export const StorageProvider: IStorageProvider = new LocalStorageProvider();

export function getProtectedVideoPath(fileName: string): string {
  return path.join(VIDEOS_DIR, fileName);
}
