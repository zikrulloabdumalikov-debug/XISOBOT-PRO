const FILE_NAME = 'xisobot_pro_data.json';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';

export interface DriveSyncData {
  tasks: any[];
  deletedTasks: any[];
  lastSync: string;
}

export const findAppDataFile = async (accessToken: string) => {
  const response = await fetch(`${DRIVE_API_URL}?q=name='${FILE_NAME}'&spaces=appDataFolder`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
};

export const downloadFileData = async (accessToken: string, fileId: string) => {
  const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return await response.json();
};

export const uploadToDrive = async (accessToken: string, fileId: string | null, content: DriveSyncData) => {
  const metadata = {
    name: FILE_NAME,
    parents: fileId ? undefined : ['appDataFolder'],
    mimeType: 'application/json'
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

  const url = fileId 
    ? `${UPLOAD_API_URL}/${fileId}?uploadType=multipart` 
    : `${UPLOAD_API_URL}?uploadType=multipart`;

  const method = fileId ? 'PATCH' : 'POST';

  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData
  });

  return await response.json();
};