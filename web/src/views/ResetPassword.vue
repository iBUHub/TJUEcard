<template>
    <div class="login-container">
        <el-card class="box-card">
            <template #header>
                <div class="card-header">
                    <span>重置密码</span>
                </div>
            </template>
            <el-form :model="form" class="login-form">
                <el-form-item>
                    <el-input v-model="form.email" placeholder="请输入注册邮箱" class="input-field"></el-input>
                </el-form-item>
                <el-form-item>
                    <div class="verification-row">
                        <el-input
                            v-model="form.code"
                            placeholder="验证码"
                            class="verification-input"
                            maxlength="6"
                        ></el-input>
                        <el-button
                            type="primary"
                            :disabled="countdown > 0"
                            class="send-code-button"
                            @click="handleSendCode"
                        >
                            {{ countdown > 0 ? `${countdown}s 后重试` : '获取验证码' }}
                        </el-button>
                    </div>
                </el-form-item>
                <el-form-item>
                    <el-input
                        v-model="form.password"
                        type="password"
                        placeholder="请输入新密码"
                        class="input-field"
                        show-password
                        @keyup.enter="handleResetPassword"
                    ></el-input>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" :loading="loading" class="register-button" @click="handleResetPassword"
                        >重置确认</el-button
                    >
                </el-form-item>
                <div class="login-link">
                    <router-link to="/login" class="link-text">返回登录</router-link>
                </div>
            </el-form>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { ElMessage } from 'element-plus';

const router = useRouter();
const form = ref({ code: '', email: '', password: '' });
const loading = ref(false);
const countdown = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const handleSendCode = async () => {
    if (!form.value.email) {
        ElMessage.warning('请输入邮箱');
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.value.email)) {
        ElMessage.warning('邮箱格式不正确');
        return;
    }
    if (!form.value.email.endsWith('@tju.edu.cn')) {
        ElMessage.warning('仅支持 @tju.edu.cn 邮箱');
        return;
    }

    try {
        const res = await api.post('/auth/send-reset-code', { email: form.value.email });
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (res.data?.dev_code && isLocal) {
            ElMessage.success(`验证码已发送 (开发模式: ${res.data.dev_code})`);
            form.value.code = res.data.dev_code;
        } else {
            ElMessage.success('验证码已发送，请检查邮箱');
        }

        countdown.value = 60;
        timer = setInterval(() => {
            countdown.value--;
            if (countdown.value <= 0) {
                if (timer) clearInterval(timer);
            }
        }, 1000);
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ElMessage.error((e as any).response?.data?.error || '发送验证码失败');
    }
};

const handleResetPassword = async () => {
    if (!form.value.email || !form.value.code || !form.value.password) {
        ElMessage.warning('请填写所有字段');
        return;
    }

    loading.value = true;
    try {
        await api.post('/auth/reset', form.value);
        ElMessage.success('密码重置成功，请使用新密码登录');
        router.push('/login');
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ElMessage.error((e as any).response?.data?.error || '重置失败');
    } finally {
        loading.value = false;
    }
};

onUnmounted(() => {
    if (timer) {
        clearInterval(timer);
    }
});
</script>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: var(--header-bg);
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
    background: var(--card-bg);
    border: var(--card-border);
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

:global(html.dark) :deep(.input-field .el-input__wrapper) {
    background-color: var(--el-input-bg-color);
}

:deep(.input-field .el-input__wrapper:hover) {
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

:deep(.input-field .el-input__wrapper.is-focus) {
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
    border-color: #667eea;
}

.verification-row {
    display: flex;
    gap: 12px;
    width: 100%;
}

.verification-input {
    flex: 1;
}

:deep(.verification-input .el-input__wrapper) {
    border-radius: 8px;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

:global(html.dark) :deep(.verification-input .el-input__wrapper) {
    background-color: var(--el-input-bg-color);
}

:deep(.verification-input .el-input__wrapper:hover) {
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

:deep(.verification-input .el-input__wrapper.is-focus) {
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
    border-color: #667eea;
}

.send-code-button {
    min-width: 110px;
    height: 32px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    background: var(--primary-btn-bg);
    border: none;
    transition: all 0.3s ease;
}

.send-code-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px var(--primary-btn-hover-shadow);
}

.send-code-button:disabled {
    background: #d9d9d9;
    color: #999;
}

.register-button {
    width: 100%;
    height: 44px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    background: var(--primary-btn-bg);
    border: none;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px var(--primary-btn-shadow);
}

.register-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px var(--primary-btn-hover-shadow);
}

.register-button:active {
    transform: translateY(0);
}

.login-link {
    text-align: center;
}

.link-text {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
}

.link-text:hover {
    color: #764ba2;
    text-decoration: underline;
}
</style>
