
// bunnyStorage.service.ts
import axios from 'axios';
import { bunnyConfig } from '../config/bunnyStorage.config';

export class BunnyStorageService {
  private static async uploadFile(
    file: Buffer,
    fileName: string,
    folder: string = ''
  ): Promise<string> {
    try {
      const path = folder ? `${folder}/${fileName}` : fileName;
      const uploadUrl = `${bunnyConfig.baseUrl}/${bunnyConfig.storageZone}/${path}`;
      
      const response = await axios.put(uploadUrl, file, {
        headers: {
          'AccessKey': bunnyConfig.accessKey,
          'Content-Type': 'application/octet-stream'
        }
      });

      if (response.status === 201) {
        // Return the CDN URL for the uploaded file
        return `${bunnyConfig.cdnUrl}/${path}`;
      } else {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Bunny Storage upload error:', error.response?.data || error.message);
      throw new Error(`Failed to upload to Bunny Storage: ${error.message}`);
    }
  }

  static async uploadImage(
    fileBuffer: Buffer,
    originalName: string,
    folder: string = 'community-posts'
  ): Promise<string> {
    // Generate unique filename
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    const fileName = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.${extension}`;
    
    return this.uploadFile(fileBuffer, fileName, folder);
  }

  static async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      // Extract the file path from the CDN URL
      const path = fileUrl.replace(`${bunnyConfig.cdnUrl}/`, '');
      const deleteUrl = `${bunnyConfig.baseUrl}/${bunnyConfig.storageZone}/${path}`;
      
      const response = await axios.delete(deleteUrl, {
        headers: {
          'AccessKey': bunnyConfig.accessKey
        }
      });

      return response.status === 200;
    } catch (error: any) {
      console.error('Bunny Storage delete error:', error.response?.data || error.message);
      return false;
    }
  }
}






