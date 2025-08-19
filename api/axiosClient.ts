// api/axiosClient.ts

import axios from 'axios';

// API 서버의 기본 URL을 설정합니다.
const BASE_URL = 'http://localhost:3000'; // 개발용 로컬호스트 주소

const axiosClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 요청 타임아웃 10초
});

// 요청 인터셉터: 모든 요청이 보내지기 전에 실행됩니다.
axiosClient.interceptors.request.use(
    async (config: any) => {
        // 여기에 인증 토큰을 헤더에 추가하는 로직을 넣을 수 있습니다.
        // 예시: const token = await AsyncStorage.getItem('token');
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
    },
    (error: any) => {
        return Promise.reject(error);
    }
);

// 응답 인터셉터: 모든 응답을 받은 후에 실행됩니다.
axiosClient.interceptors.response.use(
    (response: any) => {
        return response;
    },
    (error: any) => {
        // 응답 오류에 대한 공통 처리 로직을 여기에 추가합니다.
        // 예: if (error.response.status === 401) {
        //   console.error('인증 오류: 토큰이 만료되었습니다.');
        // }
        return Promise.reject(error);
    }
);

export default axiosClient;
