<script setup lang="ts">
import { useTheme } from './composables/useTheme';

const { setupTheme } = useTheme();
setupTheme();
</script>

<template>
    <router-view></router-view>
</template>

<style>
:root {
    /* Light Mode Variables */
    --app-bg: linear-gradient(to bottom, #f5f7fa 0%, #e8ecf1 100%);
    --header-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --header-border: none;
    --card-bg: rgba(255, 255, 255, 0.95);
    --card-border: 1px solid rgba(255, 255, 255, 0.2);
    --footer-bg: rgba(255, 255, 255, 0.85);
    --footer-hover-bg: rgba(255, 255, 255, 0.95);
    --footer-border: 1px solid rgba(255, 255, 255, 0.4);
    --table-bg: #fff;
    --table-header-bg: linear-gradient(to right, #f8f9fa, #e9ecef);
    --table-row-hover-bg: #f5f7fa;
    --loading-mask-bg: rgba(255, 255, 255, 0.9);
    --refresh-btn-hover-color: #764ba2;
    --refresh-btn-hover-shadow: rgba(118, 75, 162, 0.2);
    --primary-btn-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --primary-btn-shadow: rgba(102, 126, 234, 0.3);
    --primary-btn-hover-shadow: rgba(102, 126, 234, 0.5);

    /* Global Element Defaults */
    --el-text-color-primary: #303133;
}

html.dark {
    /* Dark Mode Variables */
    --app-bg: linear-gradient(to bottom, #111827 0%, #030712 100%);
    --header-bg: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    --header-border: 1px solid rgba(255, 255, 255, 0.08);
    --card-bg: rgba(31, 41, 55, 0.7);
    --card-border: 1px solid rgba(255, 255, 255, 0.08);
    --footer-bg: rgba(17, 24, 39, 0.85);
    --footer-hover-bg: rgba(31, 41, 55, 0.95);
    --footer-border: 1px solid rgba(255, 255, 255, 0.08);
    --table-bg: #1f2937;
    --table-header-bg: linear-gradient(to right, #374151, #1f2937);
    --table-row-hover-bg: rgba(255, 255, 255, 0.03);
    --loading-mask-bg: rgba(0, 0, 0, 0.8);
    --refresh-btn-hover-color: #a29bfe;
    --refresh-btn-hover-shadow: rgba(162, 155, 254, 0.4);
    --primary-btn-bg: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    --primary-btn-shadow: rgba(59, 130, 246, 0.3);
    --primary-btn-hover-shadow: rgba(59, 130, 246, 0.5);
}

body {
    margin: 0;
    font-family:
        'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
    background-color: #f0f2f5; /* Fallback */
    color: var(--el-text-color-primary);
}

html.dark body {
    background-color: var(--el-bg-color-page);
}
</style>
