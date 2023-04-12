export const API_ENDPOINT: string = import.meta.env.VITE_API_ENDPOINT;

export const getEndpoint = (path: string) => API_ENDPOINT + "/" + path;
