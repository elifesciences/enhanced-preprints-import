import axios from 'axios';

export const fetchDocMap = async (docMapUrl: string): Promise<string> => {
  console.log('URL', docMapUrl);

  const { data, status } = await axios.get<string>(docMapUrl, {
    transformResponse: (res) => res,
    responseType: 'text',
  });

  console.log('STATUS', status);

  if (status !== 200) {
    throw new Error('HTTP request for docmap failed (non-200 status)');
  }

  // workaround bug in data-hub API https://github.com/elifesciences/data-hub-issues/issues/589
  const json = JSON.parse(data);
  if (Array.isArray(json)) {
    return JSON.stringify(json[0]);
  }

  return data;
};
