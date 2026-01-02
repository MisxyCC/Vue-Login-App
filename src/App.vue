
<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
    <div class="max-w-md mx-auto space-y-8">
      
      <div class="text-center">
        <h1 class="text-3xl font-extrabold text-gray-900">
          BFF Auth Test
        </h1>
        <p class="mt-2 text-sm text-gray-600">
          ทดสอบระบบด้วย Vue 3 + Tailwind CSS
        </p>
      </div>

      <div v-if="loading" class="flex justify-center p-4">
        <span class="text-blue-600 font-medium animate-pulse">Loading data...</span>
      </div>

      <div v-else-if="user" class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-green-500">
        <div class="mb-6 text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-800">Login สำเร็จ!</h2>
        </div>

        <div class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-md text-sm text-gray-700">
             <p><span class="font-semibold">Username:</span> {{ user.username }}</p>
             <p><span class="font-semibold">Email:</span> {{ user.email }}</p>
             <p><span class="font-semibold">User ID:</span> {{ user.userId || user.sub }}</p>
          </div>

          <div class="mt-4">
            <p class="text-xs text-gray-500 mb-1">Raw User Data:</p>
            <pre class="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">{{ user }}</pre>
          </div>

          <div class="flex flex-col space-y-3 pt-4">
            <button 
              @click="getProfile" 
              class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Re-fetch Profile
            </button>
            <button 
              @click="logout" 
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div v-else class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-orange-400">
        <div class="mb-6 text-center">
           <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
            <svg class="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-lg leading-6 font-medium text-gray-900">
            สถานะ: ยังไม่ได้เข้าสู่ระบบ
          </h3>
          <p class="mt-2 text-sm text-gray-500">
            {{ error || 'กรุณา Login ผ่าน Keycloak เพื่อเริ่มใช้งาน' }}
          </p>
        </div>

        <div class="mt-6">
          <button 
            @click="login" 
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Login with Keycloak
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import type { QueueItem, User } from './models/types';

// --- Configuration ---
const BACKEND_URL = 'http://localhost:3005'; // แก้ให้ตรงกับ Backend ของคุณ

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
});

// --- State ---
const user = ref<User | null>(null);
const loading = ref(false);
const error = ref('');

// --- Actions ---
const login = () => {
  window.location.href = `${BACKEND_URL}/auth/login`;
};

const logout = async () => {
  try {
    // 1. ยิง POST ไปบอก Backend ให้ลบ Cookie
    const res = await api.post('/auth/logout');
    if (res.data.logoutUrl) {
      window.location.href = res.data.logoutUrl;
    } else {
      window.location.reload(); 
    }
  } catch (error) {
    console.error('Logout failed', error);
    window.location.href = '/';
  }
};

const getProfile = async () => {
  loading.value = true;
  error.value = '';
  try {
    const response = await api.get('/auth/profile');
    user.value = response.data;
  } catch (err: any) {
    console.error(err);
    user.value = null;
    if (err.response && err.response.status === 401) {
      error.value = 'ยังไม่ได้ Login หรือ Session หมดอายุ';
    } else {
      error.value = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
    }
  } finally {
    loading.value = false;
  }
};

let isRefreshing: boolean = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: Error | null, token: any = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    }
    else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use((response) => response, async (error) =>{
  const orignalRequest = error.config;
  // ถ้า Error คือ 401 และยังไม่ได้ลอง Refresh
  if (error.response.status === 401 && !orignalRequest._retry && !orignalRequest.url.includes('/auth/refresh')) {
    if (isRefreshing) {
      // ถ้ากำลัง Refresh อยู่ ให้ Request นี้รอไปก่อน
      return new Promise(function(resolve, reject){
        failedQueue.push({resolve, reject});
      }).then(() => {
        return api(orignalRequest);
      }).catch(err => {
        return Promise.reject(err);
      });
    }
    orignalRequest._retry = true;
    isRefreshing = true;

    try {
      // 1. เรียก Endpoint /auth/refresh
      await api.post('/auth/refresh');
      // 2. ถ้าผ่าน แสดงว่า Cookie ใหม่ถูกฝังแล้ว ให้แจ้งคิวที่รออยู่
      processQueue(null, true);
      // 3. ยิง Request เดิมซ้ำอีกรอบ
      return api(orignalRequest);
    } catch (refreshError) {
      // 4. ถ้า Refresh ไม่ผ่าน (หมดอายุจริง) หรือยังไม่เคย Login)
      processQueue(refreshError as Error, null);
      return Promise.reject(refreshError);    
    } finally {
      isRefreshing = false;
    }
  }
  return Promise.reject(error);
});

const fetchCsrfToken = async() => {
  try {
    const res = await api.get('/auth/csrf');
    api.defaults.headers.common['x-csrf-token'] = res.data.csrfToken;
    console.log('CSRF Token set:', res.data.csrfToken);
  } catch (error) {
    console.error('CSRF Init Failed', error);
  }
};

onMounted(async() => {
  await fetchCsrfToken();
  await getProfile();
});
</script>