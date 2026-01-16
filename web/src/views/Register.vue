<template>
    <div class="login-container">
        <el-card class="box-card">
            <template #header>
                <div class="card-header">
                    <span>Register</span>
                </div>
            </template>
            <el-form :model="form" class="login-form">
                <el-form-item>
                    <el-input v-model="form.email" placeholder="Email"></el-input>
                </el-form-item>
                <el-form-item>
                    <el-input v-model="form.password" type="password" placeholder="Password"></el-input>
                </el-form-item>
                <el-form-item>
                    <el-input v-model="confirmPass" type="password" placeholder="Confirm Password"></el-input>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" :loading="loading" style="width: 100%" @click="handleRegister"
                        >Register</el-button
                    >
                </el-form-item>
                <div style="text-align: center">
                    <router-link to="/login">Back to Login</router-link>
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
        ElMessage.error('Passwords do not match');
        return;
    }
    loading.value = true;
    try {
        await api.post('/auth/register', form.value);
        ElMessage.success('Registration success, please login');
        router.push('/login');
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ElMessage.error((e as any).response?.data?.error || 'Registration failed');
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
    background-color: #f5f7fa;
}
.box-card {
    width: 400px;
}
.card-header {
    text-align: center;
    font-weight: bold;
}
</style>
