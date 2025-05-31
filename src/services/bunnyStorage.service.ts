

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

        return `${bunnyConfig.cdnUrl}/${path}`;
      } else {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to upload to Bunny Storage: ${error.message}`);
    }
  }

  static async uploadImage(
    fileBuffer: Buffer,
    originalName: string,
    folder: string = 'community-posts'
  ): Promise<string> {

    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    const fileName = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.${extension}`;
    
    return this.uploadFile(fileBuffer, fileName, folder);
  }

  static async deleteFile(fileUrl: string): Promise<boolean> {
    try {

      const path = fileUrl.replace(`${bunnyConfig.cdnUrl}/`, '');
      const deleteUrl = `${bunnyConfig.baseUrl}/${bunnyConfig.storageZone}/${path}`;
      
      const response = await axios.delete(deleteUrl, {
        headers: {
          'AccessKey': bunnyConfig.accessKey
        }
      });

      return response.status === 200;
    } catch (error: any) {
      return false;
    }
  }
}






