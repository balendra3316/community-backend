



// services/bunnyStream.service.ts

import axios from 'axios';
import { bunnyConfig } from '../config/bunnyStorage.config';

// This new service handles all interactions with the Bunny Stream API.

interface CreateVideoResponse {
  guid: string;
  // ...other properties from Bunny API
}

export class BunnyStreamService {
  private static streamApiHeaders = {
    'AccessKey': bunnyConfig.streamApiKey,
    'Content-Type': 'application/json',
  };

  /**
   * Creates a new video object in Bunny Stream and returns its GUID.
   * @param title - The title for the video.
   * @returns The GUID of the created video.
   */
  private static async createVideo(title: string): Promise<string> {
    const createVideoUrl = `https://video.bunnycdn.com/library/${bunnyConfig.streamLibraryId}/videos`;
    try {
      const response = await axios.post<CreateVideoResponse>(
        createVideoUrl,
        { title, collectionId: bunnyConfig.streamCollectionId  },
        { headers: this.streamApiHeaders }
      );
      return response.data.guid;
    } catch (error: any) {
     // console.error('Bunny Stream API Error - createVideo:', error.response?.data);
      throw new Error(`Failed to create video in Bunny Stream: ${error.message}`);
    }
  }

  /**
   * Uploads a video file to an existing video object in Bunny Stream.
   * @param fileBuffer - The video file buffer.
   * @param videoGuid - The GUID of the video object to upload to.
   */
  private static async uploadVideoFile(fileBuffer: Buffer, videoGuid: string): Promise<void> {
    const uploadUrl = `https://video.bunnycdn.com/library/${bunnyConfig.streamLibraryId}/videos/${videoGuid}`;
    try {
      await axios.put(uploadUrl, fileBuffer, {
        headers: {
          'AccessKey': bunnyConfig.streamApiKey,
          'Content-Type': 'application/octet-stream',
        },
        maxBodyLength: Infinity, // Important for large video files
        maxContentLength: Infinity,
      });
    } catch (error: any) {
      //console.error('Bunny Stream API Error - uploadVideoFile:', error.response?.data);
      throw new Error(`Failed to upload video file: ${error.message}`);
    }
  }

  /**
   * Main method to handle video upload. It creates a video object and then uploads the file.
   * @param fileBuffer - The video file buffer.
   * @param originalName - The original name of the file to use as a title.
   * @returns An object with the video GUID, playback URL, and thumbnail URL.
   */
  static async uploadVideo(fileBuffer: Buffer, originalName: string): Promise<{ guid: string; videoUrl: string; thumbnailUrl: string }> {
    const title = originalName;
    const videoGuid = await this.createVideo(title);
    await this.uploadVideoFile(fileBuffer, videoGuid);
    
    // Construct the URLs based on Bunny Stream's format
   const videoUrl = `https://iframe.mediadelivery.net/embed/${bunnyConfig.streamLibraryId}/${videoGuid}`;
const thumbnailUrl = `${bunnyConfig.streamHostname}/${videoGuid}/thumbnail.jpg`;


    return { guid: videoGuid, videoUrl, thumbnailUrl };
  }

  /**
   * Deletes a video from Bunny Stream using its GUID.
   * @param videoGuid - The GUID of the video to delete.
   * @returns True if successful, false otherwise.
   */
  static async deleteVideo(videoGuid: string): Promise<boolean> {
    const deleteUrl = `https://video.bunnycdn.com/library/${bunnyConfig.streamLibraryId}/videos/${videoGuid}`;
    try {
      const response = await axios.delete(deleteUrl, { headers: this.streamApiHeaders });
      return response.status === 200;
    } catch (error: any) {
      //console.error('Bunny Stream API Error - deleteVideo:', error.response?.data);
      // Don't throw error, just log and return false
      return false;
    }
  }
}
