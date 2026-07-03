import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config();

// Always force DATABASE_URL to be an absolute path if it's a file URL
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("file:")) {
  const relativePath = process.env.DATABASE_URL.replace(/^file:/, "");
  // If it's a relative path, resolve it starting from the root of the project
  // Standard relative path is file:./prisma/dev.db or file:./dev.db
  const cleanPath = relativePath.startsWith("./") ? relativePath.substring(2) : relativePath;
  
  let absoluteDbPath: string;
  if (cleanPath.startsWith("prisma/")) {
    absoluteDbPath = path.resolve(process.cwd(), cleanPath);
  } else if (!cleanPath.includes("/")) {
    // e.g. file:./dev.db or file:dev.db
    absoluteDbPath = path.resolve(process.cwd(), "prisma", cleanPath);
  } else {
    absoluteDbPath = path.resolve(process.cwd(), cleanPath);
  }
  
  process.env.DATABASE_URL = `file:${absoluteDbPath}`;
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), "prisma", "dev.db")}`;
}

