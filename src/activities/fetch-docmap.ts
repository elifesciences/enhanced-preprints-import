import axios from 'axios';

export const fetchDocMap = async (docMapUrl: string): Promise<string> => {
  const { data, status } = await axios.get<string>(docMapUrl, {
    transformResponse: (res) => res,
    responseType: 'text',
  });

  if (status !== 200) {
    throw new Error('HTTP request for docmap failed (non-200 status)');
  }
  return JSON.stringify(data);
};
