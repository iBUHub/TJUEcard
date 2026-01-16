<template>
    <div class="login-container">
        <el-card class="box-card">
            <template #header>
                <div class="card-header">
                    <span>注册账户</span>
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
                    <el-input
                        v-model="confirmPass"
                        type="password"
                        placeholder="确认密码"
                        class="input-field"
                    ></el-input>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" :loading="loading" class="register-button" @click="handleRegister"
                        >注册</el-button
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { ElMessage } from 'element-plus';

const router = useRouter();
const form = ref({ email: '', password: '' });
const confirmPass = ref('');
const loading = ref(false);

const handleRegister = async () => {
    if (form.value.password !== confirmPass.value) {
        ElMessage.error('密码不匹配');
        return;
    }
    loading.value = true;
    try {
        await api.post('/auth/register', form.value);
        ElMessage.success('注册成功，请登录');
        router.push('/login');
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ElMessage.error((e as any).response?.data?.error || '注册失败');
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

.register-button {
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

.register-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
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
