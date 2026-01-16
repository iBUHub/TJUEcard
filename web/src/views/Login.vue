<template>
  <div class="login-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>TJUEcard Detect</span>
        </div>
      </template>
      <el-form :model="form" class="login-form">
        <el-form-item>
          <el-input v-model="form.email" placeholder="Email"></el-input>
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="Password"
          ></el-input>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            @click="handleLogin"
            :loading="loading"
            style="width: 100%"
            >Login</el-button
          >
        </el-form-item>
        <div style="text-align: center">
          <router-link to="/register">Create Account</router-link>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "../api"; // Direct import if alias not set, relative path
import { ElMessage } from "element-plus";

const router = useRouter();
const form = ref({ email: "", password: "" });
const loading = ref(false);

const handleLogin = async () => {
  loading.value = true;
  try {
    // Dev environment test account bypass
    if (
      import.meta.env.DEV &&
      form.value.email === "test" &&
      form.value.password === "123456"
    ) {
      // Mock token and user for dev environment
      const mockToken = "dev-test-token-" + Date.now();
      const mockUser = { id: 0, email: "test@dev.local" };

      localStorage.setItem("token", mockToken);
      localStorage.setItem("user", JSON.stringify(mockUser));
      ElMessage.success("Login success (Dev Mode)");
      router.push("/");
      return;
    }

    // Normal login flow
    const res = await api.post("/auth/login", form.value);
    localStorage.setItem("token", res.data.token); // Note: data.token, axios wraps result in data
    localStorage.setItem("user", JSON.stringify(res.data.user));
    ElMessage.success("Login success");
    router.push("/");
  } catch (e: any) {
    ElMessage.error(e.response?.data?.error || "Login failed");
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
