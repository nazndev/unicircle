import * as ImagePicker from 'expo-image-picker';
import apiClient from '../api/client';

export const pickAndUploadImage = async (uploadType: 'avatar' | 'alumni' | 'marketplace') => {
  // Request permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission to access media library is required');
  }

  // Pick image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: uploadType === 'avatar',
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  // Upload to server
  const formData = new FormData();
  const uri = result.assets[0].uri;
  const filename = uri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = match ? `image/${match[1]}` : `image/jpeg`;

  formData.append('file', {
    uri,
    name: filename,
    type: mimeType,
  } as any);

  let endpoint = '/upload/avatar';
  if (uploadType === 'alumni') endpoint = '/upload/alumni-document';
  if (uploadType === 'marketplace') endpoint = '/upload/marketplace-image';

  const response = await apiClient.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.url;
};

