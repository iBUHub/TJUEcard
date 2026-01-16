<template>
    <div class="login-container">
        <el-card class="box-card">
            <template #header>
                <div class="card-header">
                    <span>TJUEcard 电量检测</span>
                </div>
            </template>
            <el-form :model="form" class="login-form">
                <el-form-item>
                    <el-input v-model="form.email" placeholder="邮箱" class="input-field"></el-input>
                </el-form-item>
                <el-form-item>
                    <el-input v-model="form.password" type="password" placeholder="密码" class="input-field"></el-input>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" :loading="loading" class="login-button" @click="handleLogin"
                        >登录</el-button
                    >
                </el-form-item>
                <div class="register-link">
                    还没有账户？<router-link to="/register" class="link-text">立即注册</router-link>
                </div>
            </el-form>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api'; // Direct import if alias not set, relative path
import { ElMessage } from 'element-plus';

const router = useRouter();
const form = ref({ email: '', password: '' });
const loading = ref(false);

const handleLogin = async () => {
    loading.value = true;
    try {
        // Dev environment test account bypass
        const email = form.value.email.trim();
        const password = form.value.password.trim();

        console.log('Login attempt:', {
            email,
            isDev: import.meta.env.DEV,
            password,
        });

        if (import.meta.env.DEV && email === 'test' && password === '123456') {
            // Mock token and user for dev environment
            const mockToken = 'dev-test-token-' + Date.now();
            const mockUser = { email: 'test@dev.local', id: 0 };

            localStorage.setItem('token', mockToken);
            localStorage.setItem('user', JSON.stringify(mockUser));
            ElMessage.success('登录成功（开发模式）');
            router.push('/');
            return;
        }

        // Normal login flow
        const res = await api.post('/auth/login', form.value);
        localStorage.setItem('token', res.data.token); // Note: data.token, axios wraps result in data
        localStorage.setItem('user', JSON.stringify(res.data.user));
        ElMessage.success('登录成功');
        router.push('/');
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ElMessage.error((e as any).response?.data?.error || '登录失败');
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    animation: gradientShift 15s ease infinite;
    background-size: 200% 200%;
}

@keyframes gradientShift {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}

.box-card {
    width: 420px;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.card-header {
    text-align: center;
    font-weight: bold;
    font-size: 24px;
    color: #667eea;
    letter-spacing: 1px;
}

.login-form {
    padding: 10px 0;
}

:deep(.input-field .el-input__wrapper) {
    border-radius: 8px;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

:deep(.input-field .el-input__wrapper:hover) {
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

:deep(.input-field .el-input__wrapper.is-focus) {
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
    border-color: #667eea;
}

.login-button {
    width: 100%;
    height: 44px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.login-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.login-button:active {
    transform: translateY(0);
}

.register-link {
    text-align: center;
    color: #666;
    font-size: 14px;
}

.link-text {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
    margin-left: 4px;
    transition: all 0.3s ease;
}

.link-text:hover {
    color: #764ba2;
    text-decoration: underline;
}
</style>
