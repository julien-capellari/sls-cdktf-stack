import { AegisApi } from '@jujulego/aegis-api';
import axios, { AxiosRequestConfig } from 'axios';

// Api util
export const $api = new AegisApi<AxiosRequestConfig>(
  (req, signal, opts) =>
    axios.request({
      ...opts,
      method: req.method,
      baseURL: process.env.REACT_APP_API_URL,
      url: req.url,
      data: req.body,
      signal
    })
      .then((res) => res.data)
);
